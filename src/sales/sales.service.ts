import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Sale } from '../entities/sale.entity';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { HeldTransaction } from '../entities/held-transaction.entity';
import { calculateStatus } from '../inventory/inventory.service';
import { SalesRepository } from './sales.repository';
import type { CreateSaleDto } from './dto/create-sale.dto';
import type { QuerySalesDto } from './dto/query-sales.dto';
import type { RefundSaleDto } from './dto/refund-sale.dto';
import type { CreateHeldTransactionDto } from './dto/create-held-transaction.dto';

@Injectable()
export class SalesService {
  constructor(
    private salesRepository: SalesRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    user: { id: string; businessId: string },
    createSaleDto: CreateSaleDto,
  ): Promise<Sale> {
    const { sale, lowStockProducts } = await this.salesRepository.transaction(
      async (manager) => {
        let subtotal = 0;
        const lowStockProducts: InventoryItem[] = [];

        for (const item of createSaleDto.items) {
          const product = await this.salesRepository.findProduct(
            manager,
            item.productId,
            user.businessId,
          );
          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }
          if (product.quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name} (available: ${product.quantity})`,
            );
          }

          product.quantity -= item.quantity;
          product.sold += item.quantity;
          product.status = calculateStatus(
            product.quantity,
            product.reorderPoint,
          );
          await this.salesRepository.saveProduct(manager, product);

          if (
            product.status === 'low-stock' ||
            product.status === 'out-of-stock'
          ) {
            lowStockProducts.push(product);
          }

          subtotal += Number(item.price) * item.quantity;
        }

        const discountPercent = createSaleDto.discountPercent ?? 0;
        const total = subtotal - subtotal * (discountPercent / 100);

        const sale = await this.salesRepository.createSale(manager, {
          businessId: user.businessId,
          total,
          paymentMethod: createSaleDto.paymentMethod,
          status: 'completed',
          saleDate: createSaleDto.saleDate
            ? new Date(createSaleDto.saleDate)
            : new Date(),
          soldBy: user.id,
          customerId: createSaleDto.customerId,
          customerName: createSaleDto.customerName,
          discountPercent,
          items: createSaleDto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        return { sale, lowStockProducts };
      },
    );

    this.eventEmitter.emit('sale.completed', {
      businessId: user.businessId,
      sale,
    });

    for (const product of lowStockProducts) {
      this.eventEmitter.emit('inventory.low-stock', {
        businessId: product.businessId,
        item: product,
      });
    }

    return sale;
  }

  async list(user: { businessId: string }, query: QuerySalesDto) {
    return this.salesRepository.list({
      businessId: user.businessId,
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
  }

  async findOne(user: { businessId: string }, id: string): Promise<Sale> {
    const sale = await this.salesRepository.findSaleWithItemsDirect(
      id,
      user.businessId,
    );
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async refund(
    user: { businessId: string },
    id: string,
    refundDto: RefundSaleDto,
  ): Promise<Sale> {
    return this.salesRepository.transaction(async (manager) => {
      const sale = await this.salesRepository.findSaleWithItems(
        manager,
        id,
        user.businessId,
      );
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }
      if (sale.status === 'refunded') {
        throw new BadRequestException('Sale already refunded');
      }

      for (const item of sale.items) {
        const product = await this.salesRepository.findProduct(
          manager,
          item.productId,
          user.businessId,
        );
        if (product) {
          product.quantity += item.quantity;
          product.sold = Math.max(0, product.sold - item.quantity);
          product.status = calculateStatus(
            product.quantity,
            product.reorderPoint,
          );
          await this.salesRepository.saveProduct(manager, product);
        }
      }

      sale.status = 'refunded';
      sale.refundAmount = refundDto.refundAmount ?? sale.total;
      sale.refundReason = refundDto.refundReason;
      return this.salesRepository.saveSale(manager, sale);
    });
  }

  async createHeld(
    user: { id: string; businessId: string },
    createHeldDto: CreateHeldTransactionDto,
  ): Promise<HeldTransaction> {
    return this.salesRepository.createHeld({
      businessId: user.businessId,
      customerName: createHeldDto.customerName,
      items: createHeldDto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      heldBy: user.id,
      discountPercent: createHeldDto.discountPercent ?? 0,
      paymentMethod: createHeldDto.paymentMethod,
    });
  }

  async listHeld(user: { businessId: string }): Promise<HeldTransaction[]> {
    return this.salesRepository.listHeld(user.businessId);
  }

  async removeHeld(
    user: { businessId: string },
    id: string,
  ): Promise<{ message: string }> {
    const held = await this.salesRepository.findHeld(id, user.businessId);
    if (!held) {
      throw new NotFoundException('Held transaction not found');
    }
    await this.salesRepository.removeHeld(held);
    return { message: 'Held transaction removed successfully' };
  }
}
