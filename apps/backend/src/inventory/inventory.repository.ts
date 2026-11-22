import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  TransactionalRepository,
  runInTransaction,
} from '../common/transactions/transactions';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Category } from '../entities/category.entity';
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
  /** Only products whose expiry date is within this many days (or past). */
  expiring?: number;
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
    return this.findOne({
      where: { id, businessId },
      relations: ['categories'],
    });
  }

  findByBarcode(
    businessId: string,
    barcode: string,
  ): Promise<InventoryItem | null> {
    return this.findOne({ where: { businessId, barcode } });
  }

  /** The business's products, locked for the rest of the transaction. */
  lockById(businessId: string, id: string): Promise<InventoryItem | null> {
    return this.createQueryBuilder('item')
      .setLock('pessimistic_write')
      .where('item.id = :id AND item.businessId = :businessId', {
        id,
        businessId,
      })
      .getOne();
  }

  /** The named categories, created where missing (names are trimmed). */
  async ensureCategories(
    businessId: string,
    names: string[],
  ): Promise<Category[]> {
    const unique = [
      ...new Set(names.map((n) => n.trim().slice(0, 100)).filter(Boolean)),
    ];
    if (unique.length === 0) return [];
    await this.manager
      .createQueryBuilder()
      .insert()
      .into(Category)
      .values(unique.map((name) => ({ businessId, name })))
      .orIgnore()
      .execute();
    return this.manager.find(Category, {
      where: { businessId, name: In(unique) },
    });
  }

  /** The business's categories, by name. */
  listCategories(businessId: string): Promise<Category[]> {
    return this.manager.find(Category, {
      where: { businessId },
      order: { name: 'ASC' },
    });
  }

  /** Every product of the business, for matching import rows. */
  findAllForImport(businessId: string): Promise<InventoryItem[]> {
    return this.find({ where: { businessId } });
  }

  async list(
    businessId: string,
    query: InventoryListQuery,
  ): Promise<PaginatedResult<InventoryItem>> {
    const { page, limit, search, category, status, sort, expiring } = query;

    const qb = this.createQueryBuilder('item')
      .leftJoinAndSelect('item.categories', 'cat')
      .where('item.businessId = :businessId', { businessId });

    if (search) {
      qb.andWhere(
        '(item.name ILIKE :search OR item.sku ILIKE :search OR item.barcode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM "product_categories" pc
           JOIN "categories" c ON c."id" = pc."categoryId"
           WHERE pc."productId" = item.id AND c."name" = :category)`,
        { category },
      );
    }

    if (expiring !== undefined) {
      qb.andWhere(
        `item.expiryDate IS NOT NULL AND item.expiryDate <= CURRENT_DATE + :expiring::int`,
        { expiring },
      );
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
      case 'expiry':
        qb.orderBy('item.expiryDate', 'ASC', 'NULLS LAST');
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
}
