import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import type {
  CoPurchasePair,
  InventoryFact,
  SalesVelocityFact,
} from './insight.types';

@Injectable()
export class InsightRepository extends Repository<Sale> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Sale, dataSource.createEntityManager());
  }

  async inventoryFacts(businessId: string): Promise<InventoryFact[]> {
    const items = await this.manager.find(InventoryItem, {
      where: { businessId },
    });

    return items.map((item) => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      reorderPoint: item.reorderPoint ?? undefined,
      wholesalePrice: Number(item.wholesalePrice),
      sellingPrice: Number(item.sellingPrice),
      category: item.category ?? [],
    }));
  }

  async salesVelocity(
    businessId: string,
    from: Date,
    to: Date,
    previousFrom: Date,
    previousTo: Date,
  ): Promise<SalesVelocityFact[]> {
    // current 30d
    const current = await this.createQueryBuilder('s')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .innerJoin(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
      )
      .select('si.productId', 'productId')
      .addSelect('SUM(si.quantity)', 'units')
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .andWhere('s.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('si.productId')
      .getRawMany<{ productId: string; units: string }>();

    const previous = await this.createQueryBuilder('s')
      .innerJoin(SaleItem, 'si', 'si.saleId = s.id')
      .innerJoin(
        InventoryItem,
        'ii',
        'ii.id = si.productId AND ii.businessId = :businessId',
      )
      .select('si.productId', 'productId')
      .addSelect('SUM(si.quantity)', 'units')
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .andWhere('s.createdAt BETWEEN :previousFrom AND :previousTo', {
        previousFrom,
        previousTo,
      })
      .groupBy('si.productId')
      .getRawMany<{ productId: string; units: string }>();

    const prevMap = new Map<string, number>();
    for (const row of previous) prevMap.set(row.productId, Number(row.units));

    // Ensure every inventory product appears even with 0 sales
    const allIds = new Set<string>([
      ...current.map((r) => r.productId),
      ...prevMap.keys(),
    ]);

    // also include products with zero current but some previous
    // plus we need to include inventory-only products (no sales at all) – handled by caller merging
    const result: SalesVelocityFact[] = [];
    for (const id of allIds) {
      const cur = current.find((r) => r.productId === id);
      result.push({
        productId: id,
        unitsSold30d: Number(cur?.units ?? 0),
        unitsSoldPrev30d: prevMap.get(id) ?? 0,
      });
    }
    return result;
  }

  async coPurchasePairs(
    businessId: string,
    limit = 20,
  ): Promise<CoPurchasePair[]> {
    const raw = await this.manager
      .createQueryBuilder(SaleItem, 'a')
      .innerJoin(Sale, 's', 's.id = a.saleId')
      .innerJoin(
        SaleItem,
        'b',
        'b.saleId = a.saleId AND a.productId < b.productId',
      )
      .innerJoin(
        InventoryItem,
        'ia',
        'ia.id = a.productId AND ia.businessId = :businessId',
      )
      .innerJoin(
        InventoryItem,
        'ib',
        'ib.id = b.productId AND ib.businessId = :businessId',
      )
      .select('a.productId', 'productIdA')
      .addSelect('b.productId', 'productIdB')
      .addSelect('a.productName', 'nameA')
      .addSelect('b.productName', 'nameB')
      .addSelect('COUNT(*)', 'count')
      .where('s.businessId = :businessId', { businessId })
      .andWhere("s.status = 'completed'")
      .groupBy('a.productId')
      .addGroupBy('b.productId')
      .addGroupBy('a.productName')
      .addGroupBy('b.productName')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{
        productIdA: string;
        productIdB: string;
        nameA: string;
        nameB: string;
        count: string;
      }>();

    return raw.map((row) => ({
      productIdA: row.productIdA,
      productIdB: row.productIdB,
      nameA: row.nameA,
      nameB: row.nameB,
      count: Number(row.count),
    }));
  }
}
