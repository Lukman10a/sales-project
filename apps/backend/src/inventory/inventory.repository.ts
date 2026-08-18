import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

export interface InventoryListQuery {
  businessId: string;
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
}

@Injectable()
export class InventoryRepository extends Repository<InventoryItem> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(InventoryItem, dataSource.createEntityManager());
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  async findByIdAndBusiness(
    id: string,
    businessId: string,
  ): Promise<InventoryItem | null> {
    return this.findOne({ where: { id, businessId } });
  }

  async list(
    query: InventoryListQuery,
  ): Promise<PaginatedResult<InventoryItem>> {
    const { businessId, page, limit, search, category, status, sort } = query;

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
    id: string,
    businessId: string,
    qty: number,
  ): Promise<InventoryItem | null> {
    await this.createQueryBuilder()
      .update(InventoryItem)
      .set({
        quantity: () => 'quantity - :qty',
        sold: () => 'sold + :qty',
        status: () =>
          `CASE WHEN quantity - :qty <= 0 THEN 'out-of-stock' ` +
          `WHEN reorder_point IS NOT NULL AND quantity - :qty <= reorder_point THEN 'low-stock' ` +
          `ELSE 'in-stock' END`,
      })
      .where('id = :id AND businessId = :businessId AND quantity >= :qty', {
        id,
        businessId,
        qty,
      })
      .execute();

    return this.findOne({ where: { id, businessId } });
  }

  async bulkUpsert(
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
    businessId: string,
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
