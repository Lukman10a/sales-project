import { nairaSql } from '../common/money/money';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';

export interface ActivitySaleRow {
  id: string;
  businessId: string;
  total: number | string;
  status: string;
  soldBy: string;
  createdAt: Date;
  saleDate: Date;
  refundAmount?: number | string | null;
  refundReason?: string | null;
  itemCount?: number;
}

export interface ActivityInventoryRow {
  id: string;
  businessId: string;
  name: string;
  quantity: number;
  createdBy: string;
  createdAt: Date;
  confirmedBy?: string | null;
  confirmedAt?: Date | null;
  confirmedByApprentice: boolean;
}

@Injectable()
export class TeamActivityRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findRecentSales(
    businessId: string,
    limit: number,
  ): Promise<ActivitySaleRow[]> {
    const qb = this.dataSource
      .createEntityManager()
      .createQueryBuilder(Sale, 'sale')
      .leftJoin(SaleItem, 'item', 'item.saleId = sale.id')
      .select('sale.id', 'id')
      .addSelect('sale.businessId', 'businessId')
      .addSelect(nairaSql('sale.total'), 'total')
      .addSelect('sale.status', 'status')
      .addSelect('sale.soldBy', 'soldBy')
      .addSelect('sale.createdAt', 'createdAt')
      .addSelect('sale.saleDate', 'saleDate')
      .addSelect(nairaSql('sale.refundAmount'), 'refundAmount')
      .addSelect('sale.refundReason', 'refundReason')
      .addSelect('COUNT(item.id)', 'itemCount')
      .where('sale.businessId = :businessId', { businessId })
      .groupBy('sale.id')
      .orderBy('sale.createdAt', 'DESC')
      .limit(limit);

    const raw = await qb.getRawMany<Record<string, string | Date>>();
    return raw.map((r) => ({
      id: String(r.id),
      businessId: String(r.businessId),
      total: (r.total as string) ?? 0,
      status: String(r.status),
      soldBy: String(r.soldBy),
      createdAt: new Date(r.createdAt as string),
      saleDate: new Date(r.saleDate as string),
      refundAmount: (r.refundAmount as string) ?? null,
      refundReason: (r.refundReason as string) ?? null,
      itemCount: Number(r.itemCount ?? 0),
    }));
  }

  async findRecentInventory(
    businessId: string,
    limit: number,
  ): Promise<ActivityInventoryRow[]> {
    const items = await this.dataSource.getRepository(InventoryItem).find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return items.map((i) => ({
      id: i.id,
      businessId: i.businessId,
      name: i.name,
      quantity: i.quantity,
      createdBy: i.createdBy,
      createdAt: i.createdAt,
      confirmedBy: i.confirmedBy ?? null,
      confirmedAt: i.confirmedAt ?? null,
      confirmedByApprentice: i.confirmedByApprentice,
    }));
  }

  async findRecentInvites(
    businessId: string,
    limit: number,
  ): Promise<TeamMember[]> {
    return this.dataSource.getRepository(TeamMember).find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async resolveUserNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const users = await this.dataSource.getRepository(User).find({
      where: { id: In(ids) },
      select: ['id', 'firstName', 'lastName'],
    });
    return new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
    );
  }
}
