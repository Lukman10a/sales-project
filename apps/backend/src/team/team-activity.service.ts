import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AuditAction, AuditEvent } from '../entities/audit-event.entity';
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

/** How each audit action reads in the team activity feed. */
const LABELS: Record<AuditAction, [action: string, entity: string]> = {
  'sale.recorded': ['Recorded Sale', 'sale'],
  'sale.refunded': ['Refunded Sale', 'refund'],
  'product.created': ['Added Inventory', 'inventory'],
  'product.updated': ['Updated Product', 'inventory'],
  'product.price_changed': ['Changed Price', 'inventory'],
  'product.stock_adjusted': ['Adjusted Stock', 'inventory'],
  'product.confirmed': ['Confirmed Inventory', 'inventory'],
  'product.deleted': ['Deleted Product', 'inventory'],
  'product.imported': ['Imported Products', 'inventory'],
  'expense.recorded': ['Recorded Expense', 'expense'],
  'expense.updated': ['Updated Expense', 'expense'],
  'expense.deleted': ['Deleted Expense', 'expense'],
  'staff.invited': ['Invited User', 'team'],
  'staff.updated': ['Updated Member', 'team'],
  'staff.role_changed': ['Changed Role', 'team'],
  'staff.status_changed': ['Changed Status', 'team'],
  'staff.permissions_changed': ['Changed Permissions', 'team'],
  'staff.removed': ['Removed Member', 'team'],
  'auth.signed_in': ['Signed In', 'security'],
  'auth.sign_in_failed': ['Failed Sign-in', 'security'],
  'two_factor.enabled': ['Turned On 2-Step', 'security'],
  'two_factor.disabled': ['Turned Off 2-Step', 'security'],
  'two_factor.backup_codes_regenerated': ['New Backup Codes', 'security'],
  'two_factor.requirement_changed': ['Changed 2-Step Rule', 'security'],
  'session.revoked': ['Signed Out Device', 'security'],
  'session.revoked_all': ['Signed Out Everywhere', 'security'],
};

const naira = (n: unknown) => `₦${Number(n ?? 0).toLocaleString()}`;

/** One line of human-readable detail, from the event's before/after. */
function detailsOf(e: AuditEvent): string | undefined {
  const a = e.after ?? {};
  const b = e.before ?? {};
  const str = (v: unknown) =>
    typeof v === 'string' || typeof v === 'number' ? String(v) : '';
  switch (e.action) {
    case 'sale.recorded': {
      const items = Array.isArray(a.items) ? a.items : [];
      return `Sold ${items.length} item(s) for ${naira(a.total)}`;
    }
    case 'sale.refunded': {
      const reason = str(a.refundReason);
      return `Refunded ${naira(a.refundAmount)}${reason ? ` — ${reason}` : ''}`;
    }
    case 'product.created':
      return `Added ${str(a.quantity)} units of ${str(a.name)}`;
    case 'product.deleted':
      return `Deleted ${str(b.name)}`;
    case 'product.imported':
      return `Imported ${str(a.imported)} product(s)`;
    case 'expense.recorded':
      return `${str(a.category)}: ${naira(a.amount)} on ${str(a.date)}`;
    case 'expense.deleted':
      return `${str(b.category)}: ${naira(b.amount)} on ${str(b.date)}`;
    case 'staff.invited':
      return `Invited ${str(a.name)} as ${str(a.role)}`;
    case 'staff.removed':
      return `Removed ${str(b.name)}`;
    case 'staff.role_changed':
      return `${str(b.role)} → ${str(a.role)}`;
    case 'staff.status_changed':
      return `${str(b.status)} → ${str(a.status)}`;
    default: {
      const changed = Object.keys(a).filter((k) => k in b);
      return changed.length
        ? changed.map((k) => `${k}: ${str(b[k])} → ${str(a[k])}`).join(', ')
        : undefined;
    }
  }
}

/** The team activity feed: the audit trail, phrased for people. */
@Injectable()
export class TeamActivityService {
  constructor(private readonly audit: AuditService) {}

  async getActivity(
    user: { businessId: string },
    query: QueryActivityDto,
  ): Promise<PaginatedActivity> {
    const { page, limit } = query;
    const [events, total] = await this.audit.page(user.businessId, page, limit);
    return {
      data: events.map((e) => {
        const [action, entity] = LABELS[e.action];
        return {
          id: e.id,
          userId: e.actorUserId ?? '',
          userName: e.actorName,
          action,
          entity,
          entityId: e.entityId ?? undefined,
          timestamp: e.createdAt.toISOString(),
          details: detailsOf(e),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
