import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Sale } from '../entities/sale.entity';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { HeldTransaction } from '../entities/held-transaction.entity';
import { StockLedgerRepository } from '../inventory/stock-ledger.repository';
import { SalesRepository, type SalesTx } from './sales.repository';
import { AuditService } from '../audit/audit.service';
import { assertMayDiscount } from '../common/constants/access-policy';
import { fromKobo, toKobo } from '../common/money/money';
import { businessDay } from '../common/time/business-day';
import type { CurrentUserPayload } from '../common';
import {
  assertPayments,
  priceLine,
  refundShare,
  saleTotals,
  stockDemand,
  type LineRequest,
  type PricedLine,
} from './pricing';
import { requestHash } from './idempotency';
import type { CreateSaleDto } from './dto/create-sale.dto';
import type { QuerySalesDto } from './dto/query-sales.dto';
import type { RefundSaleDto } from './dto/refund-sale.dto';
import type { CreateHeldTransactionDto } from './dto/create-held-transaction.dto';

type Seller = Pick<
  CurrentUserPayload,
  'id' | 'businessId' | 'role' | 'permissions' | 'maxDiscountPercent'
> &
  Partial<Pick<CurrentUserPayload, 'name' | 'email' | 'sessionId'>>;
type Actor = Pick<CurrentUserPayload, 'id' | 'businessId'> &
  Partial<Pick<CurrentUserPayload, 'name' | 'email' | 'sessionId'>>;

/** A held sale as listed: its lines priced from today's catalogue. */
export interface PricedHeldTransaction extends Omit<HeldTransaction, 'items'> {
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: LineRequest['unit'];
    price: number;
  }>;
}

@Injectable()
export class SalesService {
  constructor(
    private salesRepository: SalesRepository,
    private eventEmitter: EventEmitter2,
    private audit: AuditService,
    private ledger: StockLedgerRepository,
  ) {}

  /**
   * Records a sale priced from the catalogue, never from the client. Stock
   * rows are locked, so two tills cannot sell the same last unit, and a
   * request repeated with the same Idempotency-Key returns the first sale.
   */
  async create(
    user: Seller,
    dto: CreateSaleDto,
    idempotencyKey: string,
  ): Promise<Sale> {
    const discountPercent = dto.discountPercent ?? 0;
    assertMayDiscount(user, discountPercent);
    const hash = requestHash(dto);
    const businessId = user.businessId;

    const { sale, lowStock, replayed } = await this.salesRepository.transaction(
      async (manager) => {
        const claim = await this.salesRepository.claimIdempotencyKey(
          businessId,
          manager,
          idempotencyKey,
          hash,
        );
        if (!claim.claimed) {
          if (claim.requestHash !== hash) {
            throw new UnprocessableEntityException(
              'This Idempotency-Key was already used for a different sale',
            );
          }
          const original = claim.saleId
            ? await this.salesRepository.findSaleWithItems(
                businessId,
                manager,
                claim.saleId,
              )
            : null;
          if (!original) {
            throw new ConflictException(
              'A sale with this Idempotency-Key is still being recorded',
            );
          }
          return { sale: original, lowStock: [], replayed: true };
        }

        const products = await this.lockedProducts(
          businessId,
          manager,
          dto.items.map((i) => i.productId),
        );
        const lines = dto.items.map((i) =>
          priceLine(products.get(i.productId)!, i),
        );
        const demand = this.checkStock(products, lines);

        const vatEnabled = await this.salesRepository.vatEnabled(
          businessId,
          manager,
        );
        const totals = saleTotals(lines, discountPercent, vatEnabled);
        assertPayments(dto, totals.totalKobo);

        const receiptNumber = await this.salesRepository.nextReceiptNumber(
          businessId,
          manager,
        );
        const sale = await this.salesRepository.createSale(
          businessId,
          manager,
          {
            receiptNumber,
            subtotal: fromKobo(totals.subtotalKobo),
            discountAmount: fromKobo(totals.discountKobo),
            vatAmount: fromKobo(totals.vatKobo),
            total: fromKobo(totals.totalKobo),
            paymentMethod: dto.paymentMethod,
            status: 'completed',
            saleDate: dto.saleDate ?? businessDay(),
            soldBy: user.id,
            customerId: dto.customerId,
            customerName: dto.customerName,
            discountPercent,
            splitPayments: dto.splitPayments,
            loyaltyPointsUsed: dto.loyaltyPointsUsed,
            accountCredit: dto.accountCredit,
            items: lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              unit: l.unit,
              quantity: l.quantity,
              unitsPerItem: l.unitsPerItem,
              price: fromKobo(l.priceKobo),
              total: fromKobo(l.totalKobo),
              unitCost: fromKobo(l.unitCostKobo),
            })),
          },
        );
        const lowStock = await this.takeStock(
          businessId,
          user.id,
          sale.id,
          products,
          demand,
        );
        await this.salesRepository.completeIdempotencyKey(
          businessId,
          manager,
          idempotencyKey,
          sale.id,
        );
        await this.audit.record({
          businessId,
          actor: user,
          action: 'sale.recorded',
          entityType: 'sale',
          entityId: sale.id,
          after: {
            receiptNumber,
            subtotal: sale.subtotal,
            discountPercent,
            discountAmount: sale.discountAmount,
            vatAmount: sale.vatAmount,
            total: sale.total,
            paymentMethod: dto.paymentMethod,
            items: lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              unit: l.unit,
              quantity: l.quantity,
              price: fromKobo(l.priceKobo),
            })),
          },
        });
        return { sale, lowStock, replayed: false };
      },
    );

    if (!replayed) {
      this.eventEmitter.emit('sale.completed', { businessId, sale });
      for (const product of lowStock) {
        this.eventEmitter.emit('inventory.low-stock', {
          businessId: product.businessId,
          item: product,
        });
      }
    }
    return sale;
  }

  /** The products named, locked; 404 if any is not in this business. */
  private async lockedProducts(
    businessId: string,
    manager: SalesTx,
    ids: string[],
  ): Promise<Map<string, InventoryItem>> {
    const unique = [...new Set(ids)];
    const rows = await this.salesRepository.lockProducts(
      businessId,
      manager,
      unique,
    );
    const byId = new Map(rows.map((p) => [p.id, p]));
    const missing = unique.find((id) => !byId.has(id));
    if (missing) throw new NotFoundException(`Product ${missing} not found`);
    return byId;
  }

  /** Stock units each locked product must give; 409 if any is short. */
  private checkStock(
    products: Map<string, InventoryItem>,
    lines: PricedLine[],
  ): Map<string, number> {
    const demand = stockDemand(lines);
    for (const [id, units] of demand) {
      const product = products.get(id)!;
      if (product.quantity < units) {
        throw new ConflictException(
          `Not enough stock for ${product.name}: ${product.quantity} left, ${units} needed`,
        );
      }
    }
    return demand;
  }

  /** Takes the checked stock through the ledger, one `sale` move per product. */
  private async takeStock(
    businessId: string,
    actorUserId: string,
    saleId: string,
    products: Map<string, InventoryItem>,
    demand: Map<string, number>,
  ): Promise<InventoryItem[]> {
    const lowStock: InventoryItem[] = [];
    for (const [id, units] of demand) {
      const product = await this.ledger.move(businessId, products.get(id)!, {
        delta: -units,
        reason: 'sale',
        refId: saleId,
        actorUserId,
        soldDelta: units,
      });
      if (product.status !== 'in-stock') lowStock.push(product);
    }
    return lowStock;
  }

  async list(user: { businessId: string }, query: QuerySalesDto) {
    const result = await this.salesRepository.list(user.businessId, {
      page: query.page,
      limit: query.limit,
      dateFrom: query.dateFrom
        ? new Date(query.dateFrom).toISOString().slice(0, 10)
        : undefined,
      dateTo: query.dateTo
        ? new Date(query.dateTo).toISOString().slice(0, 10)
        : undefined,
      paymentMethod: query.paymentMethod,
      status: query.status,
    });

    const data = await this.enrichSellers(user.businessId, result.data);

    return { ...result, data };
  }

  async findOne(user: { businessId: string }, id: string): Promise<Sale> {
    const sale = await this.salesRepository.findSaleWithItemsDirect(
      user.businessId,
      id,
    );
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    const [enriched] = await this.enrichSellers(user.businessId, [sale]);
    return enriched;
  }

  private async enrichSellers(
    businessId: string,
    sales: Sale[],
  ): Promise<Array<Sale & { soldByName?: string }>> {
    if (sales.length === 0) return sales;

    const ids = [...new Set(sales.map((sale) => sale.soldBy))];
    const names = await this.salesRepository.resolveSellerNames(
      businessId,
      ids,
    );

    return sales.map((sale) => ({
      ...sale,
      soldByName: names.get(sale.soldBy),
    }));
  }

  /**
   * Refunds the whole remaining sale, or the quantities named per line, and
   * puts that stock back. A line can never give back more than it sold.
   */
  async refund(user: Actor, id: string, dto: RefundSaleDto): Promise<Sale> {
    const businessId = user.businessId;
    const refunded = await this.salesRepository.transaction(async (manager) => {
      const sale = await this.salesRepository.lockSale(businessId, manager, id);
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'refunded') {
        throw new BadRequestException('Sale already refunded');
      }

      const lines = new Map(sale.items.map((l) => [l.id, l]));
      const wanted = new Map<string, number>();
      if (dto.items) {
        for (const r of dto.items) {
          if (!lines.has(r.saleItemId)) {
            throw new BadRequestException(
              `Line ${r.saleItemId} is not part of this sale`,
            );
          }
          wanted.set(
            r.saleItemId,
            (wanted.get(r.saleItemId) ?? 0) + r.quantity,
          );
        }
      } else {
        for (const l of sale.items) {
          const left = l.quantity - l.refundedQuantity;
          if (left > 0) wanted.set(l.id, left);
        }
      }
      for (const [lineId, qty] of wanted) {
        const line = lines.get(lineId)!;
        const left = line.quantity - line.refundedQuantity;
        if (qty > left) {
          throw new BadRequestException(
            `Cannot refund ${qty} of ${line.productName}: only ${left} left to refund`,
          );
        }
      }
      if (wanted.size === 0) {
        throw new BadRequestException('Nothing left to refund on this sale');
      }

      // Stock goes back, under the same locks a sale takes.
      const restock = new Map<string, number>();
      for (const [lineId, qty] of wanted) {
        const line = lines.get(lineId)!;
        restock.set(
          line.productId,
          (restock.get(line.productId) ?? 0) + qty * line.unitsPerItem,
        );
      }
      const products = await this.salesRepository.lockProducts(
        businessId,
        manager,
        [...restock.keys()],
      );
      for (const product of products) {
        const units = restock.get(product.id)!;
        await this.ledger.move(businessId, product, {
          delta: units,
          reason: 'refund',
          refId: sale.id,
          actorUserId: user.id,
          note: dto.refundReason,
          soldDelta: -units,
        });
      }

      let linesKobo = 0;
      for (const [lineId, qty] of wanted) {
        const line = lines.get(lineId)!;
        line.refundedQuantity += qty;
        linesKobo += toKobo(Number(line.price)) * qty;
      }
      const totalKobo = toKobo(Number(sale.total));
      const alreadyKobo = toKobo(Number(sale.refundAmount ?? 0));
      const complete = sale.items.every(
        (l) => l.refundedQuantity >= l.quantity,
      );
      const amountKobo = complete
        ? totalKobo - alreadyKobo
        : Math.min(
            totalKobo - alreadyKobo,
            refundShare(linesKobo, {
              subtotalKobo: toKobo(Number(sale.subtotal)),
              totalKobo,
            }),
          );

      const before = {
        status: sale.status,
        refundAmount: fromKobo(alreadyKobo),
      };
      sale.status = complete ? 'refunded' : 'partial-refund';
      sale.refundAmount = fromKobo(alreadyKobo + amountKobo);
      sale.refundReason = dto.refundReason;
      const saved = await this.salesRepository.saveSale(
        businessId,
        manager,
        sale,
      );
      await this.audit.record({
        businessId,
        actor: user,
        action: 'sale.refunded',
        entityType: 'sale',
        entityId: sale.id,
        before,
        after: {
          status: sale.status,
          refundAmount: sale.refundAmount,
          refunded: fromKobo(amountKobo),
          refundReason: dto.refundReason,
          items: [...wanted].map(([lineId, quantity]) => ({
            saleItemId: lineId,
            productName: lines.get(lineId)!.productName,
            quantity,
          })),
        },
      });
      return saved;
    });
    this.eventEmitter.emit('sale.refunded', { businessId, sale: refunded });
    return refunded;
  }

  async createHeld(
    user: Seller,
    dto: CreateHeldTransactionDto,
  ): Promise<HeldTransaction> {
    assertMayDiscount(user, dto.discountPercent ?? 0);
    return this.salesRepository.createHeld(user.businessId, {
      customerName: dto.customerName,
      items: dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
      })),
      heldBy: user.id,
      discountPercent: dto.discountPercent ?? 0,
      paymentMethod: dto.paymentMethod,
    });
  }

  /**
   * The caller's own held sales, priced from today's catalogue; lines whose
   * product is gone (or no longer sold by the carton) are dropped.
   */
  async listHeld(user: {
    id: string;
    businessId: string;
  }): Promise<PricedHeldTransaction[]> {
    const held = await this.salesRepository.listHeld(user.businessId, user.id);
    const ids = [
      ...new Set(held.flatMap((h) => h.items.map((i) => i.productId))),
    ];
    const products = new Map(
      (await this.salesRepository.findProducts(user.businessId, ids)).map(
        (p) => [p.id, p],
      ),
    );
    return held.map((h) => ({
      ...h,
      items: h.items.flatMap((i) => {
        const product = products.get(i.productId);
        if (!product) return [];
        try {
          const line = priceLine(product, {
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit ?? 'unit',
          });
          return [
            {
              productId: line.productId,
              productName: line.productName,
              quantity: line.quantity,
              unit: line.unit,
              price: fromKobo(line.priceKobo),
            },
          ];
        } catch {
          return [];
        }
      }),
    }));
  }

  async removeHeld(
    user: { id: string; businessId: string },
    id: string,
  ): Promise<{ message: string }> {
    const held = await this.salesRepository.findHeld(
      user.businessId,
      user.id,
      id,
    );
    if (!held) {
      throw new NotFoundException('Held transaction not found');
    }
    await this.salesRepository.removeHeld(user.businessId, held);
    return { message: 'Held transaction removed successfully' };
  }

  async settings(user: { businessId: string }) {
    return {
      vatEnabled: await this.salesRepository.vatEnabled(user.businessId),
      vatPercent: 7.5,
    };
  }

  async updateSettings(
    user: { businessId: string },
    dto: { vatEnabled: boolean },
  ) {
    await this.salesRepository.setVatEnabled(user.businessId, dto.vatEnabled);
    return this.settings(user);
  }
}
