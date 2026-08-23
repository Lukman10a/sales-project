import { Injectable } from '@nestjs/common';
import { TeamActivityRepository } from './team-activity.repository';
import type { QueryActivityDto } from './dto/query-activity.dto';

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  timestamp: string;
  details?: string;
}

export interface PaginatedActivity {
  data: ActivityEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable()
export class TeamActivityService {
  constructor(private readonly repo: TeamActivityRepository) {}

  async getActivity(
    user: { businessId: string },
    query: QueryActivityDto,
  ): Promise<PaginatedActivity> {
    const limit = query.limit;
    const page = query.page;
    // fetch more than limit per source to ensure ordering after union
    const fetchLimit = limit * 3;

    const [sales, inventory, invites] = await Promise.all([
      this.repo.findRecentSales(user.businessId, fetchLimit),
      this.repo.findRecentInventory(user.businessId, fetchLimit),
      this.repo.findRecentInvites(user.businessId, fetchLimit),
    ]);

    const userIds = [
      ...sales.map((s) => s.soldBy),
      ...inventory.map((i) => i.createdBy),
      ...inventory
        .filter((i) => i.confirmedBy)
        .map((i) => i.confirmedBy as string),
      ...invites.map((m) => m.userId),
    ].filter(Boolean);

    const names = await this.repo.resolveUserNames([...new Set(userIds)]);

    const entries: ActivityEntry[] = [];

    for (const s of sales) {
      const isRefund = s.status === 'refunded';
      const name = names.get(s.soldBy) ?? 'Unknown';
      entries.push({
        id: `sale-${s.id}${isRefund ? '-refund' : ''}`,
        userId: s.soldBy,
        userName: name,
        action: isRefund ? 'Refunded Sale' : 'Recorded Sale',
        entity: isRefund ? 'refund' : 'sale',
        entityId: s.id,
        timestamp: s.createdAt.toISOString(),
        details: isRefund
          ? `Refunded sale ${s.id}${s.refundReason ? ` — ${s.refundReason}` : ''}`
          : `Sold ${s.itemCount ?? 0} item(s) for ₦${Number(s.total).toLocaleString()}`,
      });
    }

    for (const inv of inventory) {
      const creatorName = names.get(inv.createdBy) ?? 'Unknown';
      entries.push({
        id: `inventory-${inv.id}`,
        userId: inv.createdBy,
        userName: creatorName,
        action: 'Added Inventory',
        entity: 'inventory',
        entityId: inv.id,
        timestamp: inv.createdAt.toISOString(),
        details: `Added ${inv.quantity} units of ${inv.name}`,
      });
      if (inv.confirmedBy && inv.confirmedAt) {
        const confirmer = names.get(inv.confirmedBy) ?? 'Unknown';
        entries.push({
          id: `inventory-${inv.id}-confirmed`,
          userId: inv.confirmedBy,
          userName: confirmer,
          action: 'Confirmed Inventory',
          entity: 'inventory',
          entityId: inv.id,
          timestamp: inv.confirmedAt.toISOString(),
          details: `Confirmed ${inv.name}`,
        });
      }
    }

    for (const m of invites) {
      const name = names.get(m.userId) ?? m.name;
      entries.push({
        id: `team-${m.id}`,
        userId: m.userId,
        userName: name,
        action: 'Invited User',
        entity: 'team',
        entityId: m.id,
        timestamp: m.createdAt.toISOString(),
        details: `Invited ${m.name} as ${m.role}`,
      });
    }

    entries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paged = entries.slice(start, start + limit);

    return {
      data: paged,
      pagination: { page, limit, total, pages },
    };
  }
}
