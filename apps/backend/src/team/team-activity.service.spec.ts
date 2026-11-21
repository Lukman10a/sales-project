import { TeamActivityService } from './team-activity.service';
import type { AuditService } from '../audit/audit.service';
import type { AuditEvent } from '../entities/audit-event.entity';

const event = (over: Partial<AuditEvent>): AuditEvent => ({
  id: 'e1',
  businessId: 'b1',
  actorUserId: 'u1',
  actorName: 'Ada Owner',
  action: 'sale.recorded',
  entityType: 'sale',
  entityId: 's1',
  before: null,
  after: null,
  ip: null,
  userAgent: null,
  sessionId: null,
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  ...over,
});

describe('TeamActivityService', () => {
  let page: jest.Mock;
  let service: TeamActivityService;

  beforeEach(() => {
    page = jest.fn();
    service = new TeamActivityService({ page } as unknown as AuditService);
  });

  it('reads one page of the audit trail for the business', async () => {
    page.mockResolvedValue([[], 0]);
    const result = await service.getActivity(
      { businessId: 'b1' },
      { page: 2, limit: 10 },
    );
    expect(page).toHaveBeenCalledWith('b1', 2, 10);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 0,
      pages: 1,
    });
  });

  it('phrases audit events as activity entries', async () => {
    page.mockResolvedValue([
      [
        event({
          after: {
            total: 2500,
            items: [{ productId: 'p1' }, { productId: 'p2' }],
          },
        }),
        event({
          id: 'e2',
          action: 'staff.role_changed',
          entityType: 'team_member',
          entityId: 'm1',
          before: { role: 'cashier' },
          after: { role: 'manager' },
        }),
        event({
          id: 'e3',
          action: 'product.price_changed',
          entityType: 'product',
          before: { sellingPrice: 10 },
          after: { sellingPrice: 12 },
        }),
      ],
      23,
    ]);

    const { data, pagination } = await service.getActivity(
      { businessId: 'b1' },
      { page: 1, limit: 10 },
    );

    expect(data[0]).toEqual({
      id: 'e1',
      userId: 'u1',
      userName: 'Ada Owner',
      action: 'Recorded Sale',
      entity: 'sale',
      entityId: 's1',
      timestamp: '2026-11-01T10:00:00.000Z',
      details: `Sold 2 item(s) for ₦${(2500).toLocaleString()}`,
    });
    expect(data[1]).toMatchObject({
      action: 'Changed Role',
      entity: 'team',
      details: 'cashier → manager',
    });
    expect(data[2]).toMatchObject({
      action: 'Changed Price',
      details: 'sellingPrice: 10 → 12',
    });
    expect(pagination.pages).toBe(3);
  });

  it('phrases expense events', async () => {
    const spent = { category: 'fuel', amount: 15000, date: '2026-11-20' };
    page.mockResolvedValue([
      [
        event({
          action: 'expense.recorded',
          entityType: 'expense',
          after: spent,
        }),
        event({
          action: 'expense.deleted',
          entityType: 'expense',
          before: spent,
        }),
        event({
          action: 'expense.updated',
          entityType: 'expense',
          before: { ...spent, amount: 15000 },
          after: { ...spent, amount: 16000 },
        }),
      ],
      3,
    ]);

    const { data } = await service.getActivity(
      { businessId: 'b1' },
      { page: 1, limit: 10 },
    );

    const amount = `₦${(15000).toLocaleString()}`;
    expect(data[0]).toMatchObject({
      action: 'Recorded Expense',
      entity: 'expense',
      details: `fuel: ${amount} on 2026-11-20`,
    });
    expect(data[1]).toMatchObject({ action: 'Deleted Expense' });
    expect(data[2].details).toContain('amount: 15000 → 16000');
  });

  it('keeps events without an actor', async () => {
    page.mockResolvedValue([
      [event({ actorUserId: null, actorName: 'System', entityId: null })],
      1,
    ]);
    const { data } = await service.getActivity(
      { businessId: 'b1' },
      { page: 1, limit: 10 },
    );
    expect(data[0]).toMatchObject({ userId: '', userName: 'System' });
    expect(data[0].entityId).toBeUndefined();
  });
});
