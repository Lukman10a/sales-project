import { TeamActivityService } from './team-activity.service';
import type { TeamActivityRepository } from './team-activity.repository';

describe('TeamActivityService', () => {
  let service: TeamActivityService;
  let repo: {
    findRecentSales: jest.Mock;
    findRecentInventory: jest.Mock;
    findRecentInvites: jest.Mock;
    resolveUserNames: jest.Mock;
  };

  const businessUser = { businessId: 'b1' };

  beforeEach(() => {
    repo = {
      findRecentSales: jest.fn().mockResolvedValue([]),
      findRecentInventory: jest.fn().mockResolvedValue([]),
      findRecentInvites: jest.fn().mockResolvedValue([]),
      resolveUserNames: jest.fn().mockResolvedValue(new Map()),
    };
    service = new TeamActivityService(
      repo as unknown as TeamActivityRepository,
    );
  });

  it('unions sales + inventory + refunds, sorted desc, paginated, scoped by business', async () => {
    repo.findRecentSales.mockResolvedValue([
      {
        id: 's1',
        businessId: 'b1',
        total: '100',
        status: 'completed',
        soldBy: 'u1',
        createdAt: new Date('2026-01-21T11:00:00.000Z'),
        saleDate: new Date('2026-01-21'),
        refundAmount: null,
        refundReason: null,
        itemCount: 2,
      },
      {
        id: 's2',
        businessId: 'b1',
        total: '50',
        status: 'refunded',
        soldBy: 'u2',
        createdAt: new Date('2026-01-20T11:00:00.000Z'),
        saleDate: new Date('2026-01-20'),
        refundAmount: '50',
        refundReason: 'defect',
        itemCount: 1,
      },
    ]);
    repo.findRecentInventory.mockResolvedValue([
      {
        id: 'i1',
        businessId: 'b1',
        name: 'Widget',
        quantity: 10,
        createdBy: 'u1',
        createdAt: new Date('2026-01-21T10:00:00.000Z'),
        confirmedBy: 'u3',
        confirmedAt: new Date('2026-01-21T10:30:00.000Z'),
        confirmedByApprentice: true,
      },
    ]);
    repo.findRecentInvites.mockResolvedValue([
      {
        id: 'm1',
        businessId: 'b1',
        userId: 'u4',
        name: 'Emeka',
        role: 'sales-assistant',
        createdAt: new Date('2026-01-19T09:00:00.000Z'),
      } as never,
    ]);
    repo.resolveUserNames.mockResolvedValue(
      new Map([
        ['u1', 'Alice'],
        ['u2', 'Bob'],
        ['u3', 'Cara'],
        ['u4', 'Emeka'],
      ]),
    );

    const res = await service.getActivity(businessUser, { page: 1, limit: 10 });

    expect(repo.findRecentSales).toHaveBeenCalledWith('b1', expect.any(Number));
    expect(repo.findRecentInventory).toHaveBeenCalledWith(
      'b1',
      expect.any(Number),
    );
    expect(repo.findRecentInvites).toHaveBeenCalledWith(
      'b1',
      expect.any(Number),
    );
    // total 2 sales + 2 inventory events (add + confirm) + 1 invite = 5
    expect(res.pagination.total).toBe(5);
    // sorted desc: s1 (11:00) first
    expect(res.data[0].entityId).toBe('s1');
    expect(res.data[0].userName).toBe('Alice');
    // refund entry present
    expect(res.data.some((e) => e.action === 'Refunded Sale')).toBe(true);
    // inventory addition details
    expect(res.data.some((e) => e.details?.includes('Widget'))).toBe(true);
  });

  it('paginates correctly', async () => {
    const sales = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      businessId: 'b1',
      total: '10',
      status: 'completed',
      soldBy: 'u1',
      createdAt: new Date(`2026-01-21T1${i}:00:00.000Z`),
      saleDate: new Date('2026-01-21'),
      refundAmount: null,
      refundReason: null,
      itemCount: 1,
    }));
    repo.findRecentSales.mockResolvedValue(sales);
    repo.resolveUserNames.mockResolvedValue(new Map([['u1', 'Alice']]));

    const p1 = await service.getActivity(businessUser, { page: 1, limit: 2 });
    const p2 = await service.getActivity(businessUser, { page: 2, limit: 2 });

    expect(p1.data).toHaveLength(2);
    expect(p2.data).toHaveLength(2);
    expect(p1.data[0].id).not.toBe(p2.data[0].id);
    expect(p1.pagination.pages).toBe(3);
  });

  it('isolates by businessId', async () => {
    await service.getActivity({ businessId: 'other' }, { page: 1, limit: 10 });
    expect(repo.findRecentSales).toHaveBeenCalledWith(
      'other',
      expect.any(Number),
    );
  });

  it('resolves actor names with fallback', async () => {
    repo.findRecentSales.mockResolvedValue([
      {
        id: 's1',
        businessId: 'b1',
        total: '10',
        status: 'completed',
        soldBy: 'unknown',
        createdAt: new Date('2026-01-21T11:00:00.000Z'),
        saleDate: new Date('2026-01-21'),
        refundAmount: null,
        refundReason: null,
        itemCount: 1,
      },
    ]);
    repo.resolveUserNames.mockResolvedValue(new Map());

    const res = await service.getActivity(businessUser, { page: 1, limit: 10 });
    expect(res.data[0].userName).toBe('Unknown');
  });
});
