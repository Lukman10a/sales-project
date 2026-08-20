import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parse } from 'csv-parse/sync';
import type { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryRepository } from './inventory.repository';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { DecrementInventoryDto } from './dto/decrement-inventory.dto';

export function calculateStatus(
  quantity: number,
  reorderPoint?: number,
): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (quantity <= 0) return 'out-of-stock';
  if (reorderPoint !== undefined && quantity <= reorderPoint)
    return 'low-stock';
  return 'in-stock';
}

@Injectable()
export class InventoryService {
  constructor(
    private inventoryRepository: InventoryRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async list(user: { businessId: string }, query: QueryInventoryDto) {
    const result = await this.inventoryRepository.list({
      businessId: user.businessId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      category: query.category,
      status: query.status,
      sort: query.sort,
    });

    const data = await this.enrichCreators(result.data);

    return { ...result, data };
  }

  async findOne(
    user: { businessId: string },
    id: string,
  ): Promise<InventoryItem> {
    const item = await this.inventoryRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!item) {
      throw new NotFoundException('Product not found');
    }
    const [enriched] = await this.enrichCreators([item]);
    return enriched;
  }

  private async enrichCreators(
    items: InventoryItem[],
  ): Promise<
    Array<InventoryItem & { createdByName?: string; confirmedByName?: string }>
  > {
    if (items.length === 0) return items;

    const ids = [
      ...new Set(
        items
          .flatMap((item) => [item.createdBy, item.confirmedBy])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const names = await this.inventoryRepository.resolveCreatorNames(ids);

    return items.map((item) => ({
      ...item,
      createdByName: names.get(item.createdBy),
      confirmedByName: item.confirmedBy
        ? names.get(item.confirmedBy)
        : undefined,
    }));
  }

  async create(
    user: { businessId: string; id: string; role: string },
    createInventoryDto: CreateInventoryDto,
  ): Promise<InventoryItem> {
    const isOwner = user.role === 'owner';
    const item = this.inventoryRepository.create({
      businessId: user.businessId,
      createdBy: user.id,
      name: createInventoryDto.name,
      category: createInventoryDto.category ?? [],
      sku: createInventoryDto.sku,
      barcode: createInventoryDto.barcode,
      description: createInventoryDto.description,
      wholesalePrice: createInventoryDto.wholesalePrice,
      sellingPrice: createInventoryDto.sellingPrice,
      quantity: createInventoryDto.quantity,
      reorderPoint: createInventoryDto.reorderPoint,
      supplier: createInventoryDto.supplier,
      bundleQuantity: createInventoryDto.bundleQuantity,
      bundlePrice: createInventoryDto.bundlePrice,
      image: createInventoryDto.image,
      lastRestocked: createInventoryDto.lastRestocked,
      confirmedBy: isOwner ? user.id : undefined,
      confirmedAt: isOwner ? new Date() : undefined,
      confirmedByApprentice: isOwner
        ? true
        : (createInventoryDto.confirmedByApprentice ?? false),
      status: calculateStatus(
        createInventoryDto.quantity,
        createInventoryDto.reorderPoint,
      ),
    });

    return this.inventoryRepository.save(item);
  }

  async confirm(
    user: { businessId: string; id: string; role: string },
    id: string,
  ): Promise<InventoryItem> {
    const item = await this.inventoryRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!item) {
      throw new NotFoundException('Product not found');
    }
    if (item.confirmedBy) {
      throw new BadRequestException('Product already confirmed');
    }

    const canConfirm =
      user.role === 'owner' ||
      (user.role === 'manager' && item.createdBy !== user.id) ||
      (user.role === 'apprentice' && item.createdBy === user.id);
    if (!canConfirm) {
      throw new ForbiddenException('You are not allowed to confirm this item');
    }

    item.confirmedBy = user.id;
    item.confirmedAt = new Date();
    item.confirmedByApprentice = true;

    return this.inventoryRepository.save(item);
  }

  async update(
    user: { businessId: string },
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryItem> {
    const item = await this.inventoryRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!item) {
      throw new NotFoundException('Product not found');
    }

    if (updateInventoryDto.name !== undefined)
      item.name = updateInventoryDto.name;
    if (updateInventoryDto.category !== undefined)
      item.category = updateInventoryDto.category;
    if (updateInventoryDto.sku !== undefined) item.sku = updateInventoryDto.sku;
    if (updateInventoryDto.barcode !== undefined)
      item.barcode = updateInventoryDto.barcode;
    if (updateInventoryDto.description !== undefined)
      item.description = updateInventoryDto.description;
    if (updateInventoryDto.wholesalePrice !== undefined)
      item.wholesalePrice = updateInventoryDto.wholesalePrice;
    if (updateInventoryDto.sellingPrice !== undefined)
      item.sellingPrice = updateInventoryDto.sellingPrice;
    if (updateInventoryDto.quantity !== undefined)
      item.quantity = updateInventoryDto.quantity;
    if (updateInventoryDto.reorderPoint !== undefined)
      item.reorderPoint = updateInventoryDto.reorderPoint ?? undefined;
    if (updateInventoryDto.supplier !== undefined)
      item.supplier = updateInventoryDto.supplier;
    if (updateInventoryDto.bundleQuantity !== undefined)
      item.bundleQuantity = updateInventoryDto.bundleQuantity ?? undefined;
    if (updateInventoryDto.bundlePrice !== undefined)
      item.bundlePrice = updateInventoryDto.bundlePrice ?? undefined;
    if (updateInventoryDto.image !== undefined)
      item.image = updateInventoryDto.image;
    if (updateInventoryDto.lastRestocked !== undefined)
      item.lastRestocked = updateInventoryDto.lastRestocked;
    if (updateInventoryDto.confirmedByApprentice !== undefined)
      item.confirmedByApprentice = updateInventoryDto.confirmedByApprentice;

    item.status = calculateStatus(item.quantity, item.reorderPoint);

    return this.inventoryRepository.save(item);
  }

  async remove(
    user: { businessId: string },
    id: string,
  ): Promise<{ message: string }> {
    const item = await this.inventoryRepository.findByIdAndBusiness(
      id,
      user.businessId,
    );
    if (!item) {
      throw new NotFoundException('Product not found');
    }
    await this.inventoryRepository.remove(item);
    return { message: 'Product deleted successfully' };
  }

  async decrement(
    user: { businessId: string },
    id: string,
    decrementInventoryDto: DecrementInventoryDto,
  ): Promise<InventoryItem> {
    const item = await this.inventoryRepository.decrementStock(
      id,
      user.businessId,
      decrementInventoryDto.quantity,
    );
    if (!item) {
      throw new NotFoundException('Product not found');
    }
    if (item.quantity < decrementInventoryDto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }
    if (item.status === 'low-stock' || item.status === 'out-of-stock') {
      this.eventEmitter.emit('inventory.low-stock', {
        businessId: item.businessId,
        item,
      });
    }
    return item;
  }

  async bulkImport(
    user: { businessId: string; id: string },
    file: { buffer: Buffer; mimetype: string },
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const rows = this.parseFile(file);
    const errors: string[] = [];
    const valid: Array<{
      name: string;
      category: string[];
      sku?: string;
      barcode?: string;
      description?: string;
      wholesalePrice: number;
      sellingPrice: number;
      quantity: number;
      reorderPoint?: number;
      supplier?: string;
      status: InventoryItem['status'];
    }> = [];
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        valid.push(this.mapRowToItem(row, i));
      } catch (err) {
        skipped++;
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }

    if (valid.length === 0) {
      throw new BadRequestException(
        'No valid rows to import: ' + (errors.join('; ') || 'empty file'),
      );
    }

    const imported = await this.inventoryRepository.bulkUpsert(
      valid,
      user.businessId,
      user.id,
    );

    return { imported, skipped, errors };
  }

  private parseFile(file: {
    buffer: Buffer;
    mimetype: string;
  }): Record<string, unknown>[] {
    const text = file.buffer.toString('utf-8').trim();
    if (!text) {
      throw new BadRequestException('Empty file provided');
    }

    const isJson = file.mimetype.includes('json') || text.startsWith('[');
    if (isJson) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new BadRequestException('JSON body must be an array');
        }
        return parsed.map((value) => {
          if (value !== null && typeof value === 'object') {
            return value as Record<string, unknown>;
          }
          throw new BadRequestException('JSON array must contain only objects');
        });
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException(
          'Invalid JSON payload: ' + (err as Error).message,
        );
      }
    }

    try {
      return parse(text, { columns: true, skip_empty_lines: true });
    } catch {
      throw new BadRequestException('Invalid CSV payload');
    }
  }

  private mapRowToItem(
    row: Record<string, unknown>,
    index: number,
  ): {
    name: string;
    category: string[];
    sku?: string;
    barcode?: string;
    description?: string;
    wholesalePrice: number;
    sellingPrice: number;
    quantity: number;
    reorderPoint?: number;
    supplier?: string;
    status: InventoryItem['status'];
  } {
    const name = this.requiredString(row.name, index);
    const sellingPrice = this.numberField(row.sellingPrice, index);
    const wholesalePrice = this.numberField(row.wholesalePrice ?? 0, index);
    const quantity = this.intField(row.quantity ?? 0, index);
    const reorderPoint =
      row.reorderPoint === '' || row.reorderPoint === undefined
        ? undefined
        : this.intField(row.reorderPoint, index);

    const category = this.stringArray(row.category, index);

    return {
      name,
      category,
      sku: this.optionalString(row.sku),
      barcode: this.optionalString(row.barcode),
      description: this.optionalString(row.description),
      wholesalePrice,
      sellingPrice,
      quantity,
      reorderPoint,
      supplier: this.optionalString(row.supplier),
      status: calculateStatus(quantity, reorderPoint),
    };
  }

  private requiredString(value: unknown, index: number): string {
    const str = this.toTrimmedString(value);
    if (!str)
      throw new BadRequestException(`Row ${index + 1}: name is required`);
    return str;
  }

  private optionalString(value: unknown): string | undefined {
    const str = this.toTrimmedString(value);
    return str === '' ? undefined : str;
  }

  private stringArray(value: unknown, index: number): string[] {
    const raw = this.toTrimmedString(value);
    if (raw === '') return [];
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      throw new BadRequestException(`Row ${index + 1}: invalid category`);
    }
    return parts;
  }

  private toTrimmedString(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    return '';
  }

  private numberField(value: unknown, index: number): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      throw new BadRequestException(
        `Row ${index + 1}: sellingPrice/wholesalePrice must be non-negative numbers`,
      );
    }
    return num;
  }

  private intField(value: unknown, index: number): number {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new BadRequestException(
        `Row ${index + 1}: quantity/reorderPoint must be non-negative integers`,
      );
    }
    return num;
  }
}
