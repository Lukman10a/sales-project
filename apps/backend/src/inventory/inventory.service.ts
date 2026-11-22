import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { StockMovement } from '../entities/stock-movement.entity';
import { InventoryRepository } from './inventory.repository';
import {
  NegativeStockError,
  StockLedgerRepository,
  type StockChange,
} from './stock-ledger.repository';
import { calculateStatus } from './stock-status';
import { readImportFile, validateRow, type ImportFile } from './product-import';
import { AuditService } from '../audit/audit.service';
import { assertMayEditProduct } from '../common/constants/access-policy';
import type { CurrentUserPayload } from '../common';
import type { CreateInventoryDto } from './dto/create-inventory.dto';
import type { UpdateInventoryDto } from './dto/update-inventory.dto';
import type { QueryInventoryDto } from './dto/query-inventory.dto';
import type { RestockDto, AdjustStockDto } from './dto/stock.dto';

export { calculateStatus } from './stock-status';

/** Who is acting, for the audit trail. */
type Actor = Pick<CurrentUserPayload, 'id' | 'businessId'> &
  Partial<Pick<CurrentUserPayload, 'name' | 'email' | 'sessionId'>>;
/** A product as the API returns it. */
export type ProductView = Omit<InventoryItem, 'exposeCategoryNames'> & {
  createdByName?: string;
};
type Editor = Actor &
  Pick<CurrentUserPayload, 'role' | 'permissions' | 'maxDiscountPercent'>;

/** Product fields the audit trail records. */
const AUDITED_FIELDS = [
  'name',
  'category',
  'sku',
  'barcode',
  'description',
  'costPrice',
  'sellingPrice',
  'cartonSize',
  'cartonPrice',
  'expiryDate',
  'reorderPoint',
  'supplier',
] as const;
const PRICE_FIELDS = new Set(['costPrice', 'sellingPrice', 'cartonPrice']);

function pick(
  item: InventoryItem,
  fields: readonly string[],
): Record<string, unknown> {
  const row = item as unknown as Record<string, unknown>;
  return Object.fromEntries(fields.map((f) => [f, row[f] ?? null]));
}

function only(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, record[k]]));
}

/** One import row as the preview shows it and the confirm applies it. */
export interface ImportPlanRow {
  row: number;
  name: string;
  action: 'create' | 'update';
  productId?: string;
  /** Stock after the import. */
  quantity: number;
  /** Change the import makes to stock (a movement when not 0). */
  stockChange: number;
  errors: string[];
}

export interface ImportPreview {
  summary: {
    rows: number;
    valid: number;
    invalid: number;
    creates: number;
    updates: number;
  };
  rows: ImportPlanRow[];
}

@Injectable()
export class InventoryService {
  constructor(
    private inventoryRepository: InventoryRepository,
    private ledger: StockLedgerRepository,
    private eventEmitter: EventEmitter2,
    private audit: AuditService,
  ) {}

  async list(user: { businessId: string }, query: QueryInventoryDto) {
    const result = await this.inventoryRepository.list(user.businessId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      category: query.category,
      status: query.status,
      sort: query.sort,
      expiring: query.expiring,
    });
    const data = await this.enrichCreators(user.businessId, result.data);
    return { ...result, data };
  }

  async findOne(
    user: { businessId: string },
    id: string,
  ): Promise<ProductView> {
    const item = await this.mustFind(user.businessId, id);
    const [enriched] = await this.enrichCreators(user.businessId, [item]);
    return enriched;
  }

  async categories(user: { businessId: string }) {
    const rows = await this.inventoryRepository.listCategories(user.businessId);
    return rows.map((c) => ({ id: c.id, name: c.name }));
  }

  /** A product's stock movements, newest first. */
  async history(
    user: { businessId: string },
    id: string,
    limit = 50,
  ): Promise<Array<StockMovement & { actorName?: string }>> {
    await this.mustFind(user.businessId, id);
    const rows = await this.ledger.history(user.businessId, id, limit);
    const names = await this.inventoryRepository.resolveCreatorNames(
      user.businessId,
      [
        ...new Set(
          rows.map((r) => r.actorUserId).filter((x): x is string => !!x),
        ),
      ],
    );
    return rows.map((r) => ({
      ...r,
      actorName: r.actorUserId ? names.get(r.actorUserId) : undefined,
    }));
  }

  private async mustFind(businessId: string, id: string) {
    const item = await this.inventoryRepository.findById(businessId, id);
    if (!item) throw new NotFoundException('Product not found');
    return item;
  }

  private async enrichCreators(
    businessId: string,
    items: InventoryItem[],
  ): Promise<ProductView[]> {
    if (items.length === 0) return [];
    const ids = [...new Set(items.map((i) => i.createdBy).filter(Boolean))];
    const names = await this.inventoryRepository.resolveCreatorNames(
      businessId,
      ids,
    );
    return items.map((item) => ({
      ...item,
      createdByName: names.get(item.createdBy),
    }));
  }

  private async assertBarcodeFree(
    businessId: string,
    barcode: string | undefined | null,
    exceptId?: string,
  ) {
    if (!barcode) return;
    const owner = await this.inventoryRepository.findByBarcode(
      businessId,
      barcode,
    );
    if (owner && owner.id !== exceptId) {
      throw new ConflictException(
        `Barcode ${barcode} is already used by ${owner.name}`,
      );
    }
  }

  async create(user: Actor, dto: CreateInventoryDto): Promise<ProductView> {
    const businessId = user.businessId;
    const created = await this.inventoryRepository.transaction(async () => {
      await this.assertBarcodeFree(businessId, dto.barcode);
      const item = this.inventoryRepository.createItem(businessId, {
        createdBy: user.id,
        name: dto.name,
        categories: await this.inventoryRepository.ensureCategories(
          businessId,
          dto.category ?? [],
        ),
        sku: dto.sku,
        barcode: dto.barcode || undefined,
        description: dto.description,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        quantity: 0,
        reorderPoint: dto.reorderPoint,
        supplier: dto.supplier,
        cartonSize: dto.cartonSize,
        cartonPrice: dto.cartonPrice,
        expiryDate: dto.expiryDate ?? null,
        image: dto.image,
        status: calculateStatus(0, dto.reorderPoint),
      });
      const saved = await this.inventoryRepository.saveItem(businessId, item);
      saved.category = (saved.categories ?? []).map((c) => c.name);
      if (dto.quantity > 0) {
        await this.ledger.move(businessId, saved, {
          delta: dto.quantity,
          reason: 'restock',
          actorUserId: user.id,
          note: 'Opening stock',
        });
      }
      await this.audit.record({
        businessId,
        actor: user,
        action: 'product.created',
        entityType: 'product',
        entityId: saved.id,
        after: { ...pick(saved, AUDITED_FIELDS), quantity: saved.quantity },
      });
      return saved;
    });
    return this.findOne(user, created.id);
  }

  /**
   * Edits product details. Stock is not editable here: it changes only
   * through sales, refunds, restocks, adjustments and imports.
   */
  async update(
    user: Editor,
    id: string,
    dto: UpdateInventoryDto,
  ): Promise<ProductView> {
    const businessId = user.businessId;
    assertMayEditProduct(
      user,
      Object.keys(dto).filter(
        (k) => dto[k as keyof UpdateInventoryDto] !== undefined,
      ),
    );
    await this.inventoryRepository.transaction(async () => {
      const item = await this.mustFind(businessId, id);
      const before = pick(item, AUDITED_FIELDS);
      if (dto.barcode)
        await this.assertBarcodeFree(businessId, dto.barcode, id);

      if (dto.name !== undefined) item.name = dto.name;
      if (dto.category !== undefined) {
        item.categories = await this.inventoryRepository.ensureCategories(
          businessId,
          dto.category,
        );
      }
      if (dto.sku !== undefined) item.sku = dto.sku;
      if (dto.barcode !== undefined) item.barcode = dto.barcode || undefined;
      if (dto.description !== undefined) item.description = dto.description;
      if (dto.costPrice !== undefined) item.costPrice = dto.costPrice;
      if (dto.sellingPrice !== undefined) item.sellingPrice = dto.sellingPrice;
      if (dto.reorderPoint !== undefined)
        item.reorderPoint = dto.reorderPoint ?? undefined;
      if (dto.supplier !== undefined) item.supplier = dto.supplier;
      if (dto.cartonSize !== undefined)
        item.cartonSize = dto.cartonSize ?? undefined;
      if (dto.cartonPrice !== undefined)
        item.cartonPrice = dto.cartonPrice ?? undefined;
      if (dto.expiryDate !== undefined) item.expiryDate = dto.expiryDate;
      if (dto.image !== undefined) item.image = dto.image;
      item.status = calculateStatus(item.quantity, item.reorderPoint);

      const saved = await this.inventoryRepository.saveItem(businessId, item);
      saved.category = (saved.categories ?? []).map((c) => c.name);
      const after = pick(saved, AUDITED_FIELDS);
      const changed = Object.keys(after).filter(
        (k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]),
      );
      if (changed.length === 0) return;
      await this.audit.record({
        businessId,
        actor: user,
        action: changed.some((k) => PRICE_FIELDS.has(k))
          ? 'product.price_changed'
          : 'product.updated',
        entityType: 'product',
        entityId: saved.id,
        before: only(before, changed),
        after: only(after, changed),
      });
    });
    return this.findOne(user, id);
  }

  /** Stock received. */
  restock(user: Actor, id: string, dto: RestockDto) {
    return this.changeStock(user, id, {
      delta: dto.quantity,
      reason: 'restock',
      note: dto.note,
    });
  }

  /** A correction (count, damage, theft...); the reason is required. */
  adjust(user: Actor, id: string, dto: AdjustStockDto) {
    return this.changeStock(user, id, {
      delta: dto.delta,
      reason: 'adjustment',
      note: dto.reason,
    });
  }

  private async changeStock(
    user: Actor,
    id: string,
    change: Omit<StockChange, 'actorUserId'>,
  ): Promise<ProductView> {
    const businessId = user.businessId;
    const item = await this.inventoryRepository.transaction(async () => {
      const product = await this.inventoryRepository.lockById(businessId, id);
      if (!product) throw new NotFoundException('Product not found');
      const before = product.quantity;
      if (before + change.delta < 0) {
        throw new BadRequestException(
          `Only ${before} of ${product.name} in stock; cannot remove ${-change.delta}`,
        );
      }
      try {
        await this.ledger.move(businessId, product, {
          ...change,
          actorUserId: user.id,
        });
      } catch (err) {
        if (err instanceof NegativeStockError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      await this.audit.record({
        businessId,
        actor: user,
        action: 'product.stock_adjusted',
        entityType: 'product',
        entityId: id,
        before: { quantity: before },
        after: {
          quantity: product.quantity,
          reason: change.reason,
          note: change.note ?? null,
        },
      });
      return product;
    });
    this.alertIfLow(item);
    return this.findOne(user, id);
  }

  private alertIfLow(item: InventoryItem) {
    if (item.status === 'low-stock' || item.status === 'out-of-stock') {
      this.eventEmitter.emit('inventory.low-stock', {
        businessId: item.businessId,
        item,
      });
    }
  }

  async remove(user: Actor, id: string): Promise<{ message: string }> {
    await this.inventoryRepository.transaction(async () => {
      const item = await this.mustFind(user.businessId, id);
      await this.inventoryRepository.removeItem(user.businessId, item);
      await this.audit.record({
        businessId: user.businessId,
        actor: user,
        action: 'product.deleted',
        entityType: 'product',
        entityId: id,
        before: { ...pick(item, AUDITED_FIELDS), quantity: item.quantity },
      });
    });
    return { message: 'Product deleted successfully' };
  }

  /** Dry run: what the file would do, row by row. Writes nothing. */
  async previewImport(user: Actor, file: ImportFile): Promise<ImportPreview> {
    const plan = await this.planImport(user.businessId, file);
    return summarise(plan.map((p) => p.view));
  }

  /**
   * Applies the file's valid rows in one transaction; invalid rows are
   * skipped and reported. The plan is rebuilt here, so the verdicts are the
   * preview's, against current stock.
   */
  async confirmImport(user: Actor, file: ImportFile): Promise<ImportPreview> {
    const businessId = user.businessId;
    return this.inventoryRepository.transaction(async () => {
      const plan = await this.planImport(businessId, file);
      const valid = plan.filter((p) => p.view.errors.length === 0);
      if (valid.length === 0) {
        throw new BadRequestException(
          'No row can be imported; fix the errors and try again',
        );
      }
      const note = file.originalname
        ? `Import from ${file.originalname}`.slice(0, 500)
        : 'Import';
      for (const { view, product, existing } of valid) {
        const item =
          existing ??
          this.inventoryRepository.createItem(businessId, {
            createdBy: user.id,
            quantity: 0,
          });
        Object.assign(item, {
          name: product!.name,
          sellingPrice: product!.sellingPrice,
          ...(product!.costPrice !== undefined && {
            costPrice: product!.costPrice,
          }),
          ...(!existing &&
            product!.costPrice === undefined && { costPrice: 0 }),
          ...(product!.sku !== undefined && { sku: product!.sku }),
          ...(product!.barcode !== undefined && { barcode: product!.barcode }),
          ...(product!.reorderPoint !== undefined && {
            reorderPoint: product!.reorderPoint,
          }),
          ...(product!.cartonSize !== undefined && {
            cartonSize: product!.cartonSize,
            cartonPrice: product!.cartonPrice,
          }),
          ...(product!.expiryDate !== undefined && {
            expiryDate: product!.expiryDate,
          }),
          ...(product!.supplier !== undefined && {
            supplier: product!.supplier,
          }),
          ...(product!.description !== undefined && {
            description: product!.description,
          }),
        });
        if (product!.category.length > 0) {
          item.categories = await this.inventoryRepository.ensureCategories(
            businessId,
            product!.category,
          );
        }
        item.status = calculateStatus(item.quantity, item.reorderPoint);
        const saved = await this.inventoryRepository.saveItem(businessId, item);
        view.productId = saved.id;
        if (view.stockChange !== 0) {
          await this.ledger.move(businessId, saved, {
            delta: view.stockChange,
            reason: 'import',
            actorUserId: user.id,
            note,
          });
        }
      }
      const result = summarise(plan.map((p) => p.view));
      await this.audit.record({
        businessId,
        actor: user,
        action: 'product.imported',
        entityType: 'product',
        after: {
          file: file.originalname ?? null,
          ...result.summary,
          names: valid.map((v) => v.view.name).slice(0, 200),
        },
      });
      return result;
    });
  }

  private async planImport(businessId: string, file: ImportFile) {
    const rows = await readImportFile(file);
    const existing =
      await this.inventoryRepository.findAllForImport(businessId);
    const key = (s: string) => s.trim().toLowerCase();
    const bySku = new Map<string, InventoryItem>();
    const byBarcode = new Map<string, InventoryItem>();
    const byName = new Map<string, InventoryItem>();
    for (const p of existing) {
      if (p.sku) bySku.set(key(p.sku), p);
      if (p.barcode) byBarcode.set(p.barcode.trim(), p);
      byName.set(key(p.name), p);
    }
    const seenSku = new Map<string, number>();
    const seenBarcode = new Map<string, number>();
    const seenProduct = new Map<string, number>();

    return rows.map(({ row, values }) => {
      const { product, errors } = validateRow(values);
      let match: InventoryItem | undefined;
      if (product) {
        match =
          (product.sku && bySku.get(key(product.sku))) ||
          (product.barcode && byBarcode.get(product.barcode)) ||
          byName.get(key(product.name)) ||
          undefined;
        const dupe = (
          seen: Map<string, number>,
          value: string | undefined,
          label: string,
        ) => {
          if (!value) return;
          const first = seen.get(value);
          if (first !== undefined) {
            errors.push(`${label} also appears on row ${first}`);
          } else seen.set(value, row);
        };
        dupe(seenSku, product.sku && key(product.sku), `sku ${product.sku}`);
        dupe(seenBarcode, product.barcode, `barcode ${product.barcode}`);
        dupe(
          seenProduct,
          match ? match.id : `new:${key(product.name)}`,
          match?.name ?? product.name,
        );
        const holder = product.barcode
          ? byBarcode.get(product.barcode)
          : undefined;
        if (holder && holder.id !== match?.id) {
          errors.push(
            `barcode ${product.barcode} is already used by ${holder.name}`,
          );
        }
      }
      const current = match?.quantity ?? 0;
      const target = product?.quantity ?? current;
      const view: ImportPlanRow = {
        row,
        name: product?.name ?? values.name ?? '',
        action: match ? 'update' : 'create',
        productId: match?.id,
        quantity: target,
        stockChange: errors.length ? 0 : target - current,
        errors,
      };
      return {
        view,
        product: errors.length ? undefined : product,
        existing: match,
      };
    });
  }
}

function summarise(rows: ImportPlanRow[]): ImportPreview {
  const valid = rows.filter((r) => r.errors.length === 0);
  return {
    summary: {
      rows: rows.length,
      valid: valid.length,
      invalid: rows.length - valid.length,
      creates: valid.filter((r) => r.action === 'create').length,
      updates: valid.filter((r) => r.action === 'update').length,
    },
    rows,
  };
}
