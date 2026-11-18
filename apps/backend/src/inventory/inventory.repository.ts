import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  TransactionalRepository,
  runInTransaction,
} from '../common/transactions/transactions';
import { InventoryItem } from '../entities/inventory-item.entity';
import { User } from '../entities/user.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertTenant } from '../common/tenancy/assert-tenant';

export interface InventoryListQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
}

/** Tenant-owned: every method takes `businessId` first. */
@Injectable()
export class InventoryRepository extends TransactionalRepository<InventoryItem> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(InventoryItem, dataSource.createEntityManager());
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return runInTransaction(this.dataSource, fn);
  }

  createItem(
    businessId: string,
    data: Omit<Partial<InventoryItem>, 'businessId'>,
  ): InventoryItem {
    return this.create({ ...data, businessId });
  }

  saveItem(businessId: string, item: InventoryItem): Promise<InventoryItem> {
    assertTenant(businessId, item);
    return this.save(item);
  }

  async removeItem(businessId: string, item: InventoryItem): Promise<void> {
    assertTenant(businessId, item);
    await this.remove(item);
  }

  async resolveCreatorNames(
    businessId: string,
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const users = await this.manager.find(User, {
      where: { id: In(ids), businessId },
      select: ['id', 'firstName', 'lastName'],
    });

    return new Map(
      users.map((user) => [user.id, `${user.firstName} ${user.lastName}`]),
    );
  }

  async findById(
    businessId: string,
    id: string,
  ): Promise<InventoryItem | null> {
    return this.findOne({ where: { id, businessId } });
  }

  async list(
    businessId: string,
    query: InventoryListQuery,
  ): Promise<PaginatedResult<InventoryItem>> {
    const { page, limit, search, category, status, sort } = query;

    const qb = this.createQueryBuilder('item').where(
      'item.businessId = :businessId',
      { businessId },
    );

    if (search) {
      qb.andWhere(
        '(item.name ILIKE :search OR item.sku ILIKE :search OR item.barcode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      qb.andWhere(':category = ANY(item.category)', { category });
    }

    if (status) {
      qb.andWhere('item.status = :status', { status });
    }

    switch (sort) {
      case 'price-asc':
        qb.orderBy('item.sellingPrice', 'ASC');
        break;
      case 'price-desc':
        qb.orderBy('item.sellingPrice', 'DESC');
        break;
      case 'quantity':
        qb.orderBy('item.quantity', 'DESC');
        break;
      case 'sold':
        qb.orderBy('item.sold', 'DESC');
        break;
      case 'name':
      default:
        qb.orderBy('item.name', 'ASC');
        break;
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async decrementStock(
    businessId: string,
    id: string,
    qty: number,
  ): Promise<{ item: InventoryItem | null; decremented: boolean }> {
    const result = await this.createQueryBuilder()
      .update(InventoryItem)
      .set({
        quantity: () => 'quantity - :qty',
        sold: () => 'sold + :qty',
        status: () =>
          `(CASE WHEN quantity - :qty <= 0 THEN 'out-of-stock' ` +
          `WHEN "reorderPoint" IS NOT NULL AND quantity - :qty <= "reorderPoint" THEN 'low-stock' ` +
          `ELSE 'in-stock' END)::"inventory_items_status_enum"`,
      })
      .where('id = :id AND businessId = :businessId AND quantity >= :qty', {
        id,
        businessId,
        qty,
      })
      .execute();

    const item = await this.findOne({ where: { id, businessId } });
    return { item, decremented: (result.affected ?? 0) > 0 };
  }

  async bulkUpsert(
    businessId: string,
    items: Array<{
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
    }>,
    createdBy: string,
  ): Promise<number> {
    const prepared = items.map((item) => ({
      ...item,
      businessId,
      createdBy,
    }));

    await this.createQueryBuilder()
      .insert()
      .into(InventoryItem)
      .values(prepared)
      .orUpdate(
        [
          'name',
          'category',
          'sku',
          'barcode',
          'description',
          'wholesalePrice',
          'sellingPrice',
          'quantity',
          'reorderPoint',
          'supplier',
          'status',
        ],
        ['sku'],
      )
      .execute();

    return prepared.length;
  }
}
