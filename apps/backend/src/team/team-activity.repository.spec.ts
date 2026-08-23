import { TeamActivityRepository } from './team-activity.repository';

describe('TeamActivityRepository', () => {
  let repo: TeamActivityRepository;
  let dataSource: {
    createEntityManager: jest.Mock;
    getRepository: jest.Mock;
  };
  let manager: {
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    manager = {
      createQueryBuilder: jest.fn(),
    };
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue(manager),
      getRepository: jest.fn(),
    };
    repo = new TeamActivityRepository(dataSource as never);
  });

  it('findRecentSales scopes by businessId and orders DESC', async () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 's1',
          businessId: 'b1',
          total: '100',
          status: 'completed',
          soldBy: 'u1',
          createdAt: '2026-01-21T11:00:00.000Z',
          saleDate: '2026-01-21',
          refundAmount: null,
          refundReason: null,
          itemCount: '2',
        },
      ]),
    };
    manager.createQueryBuilder.mockReturnValue(qb);

    const rows = await repo.findRecentSales('b1', 10);

    expect(qb.where).toHaveBeenCalledWith('sale.businessId = :businessId', {
      businessId: 'b1',
    });
    expect(qb.orderBy).toHaveBeenCalledWith('sale.createdAt', 'DESC');
    expect(qb.limit).toHaveBeenCalledWith(10);
    expect(rows[0].id).toBe('s1');
  });

  it('findRecentInventory scopes by businessId', async () => {
    const find = jest.fn().mockResolvedValue([
      {
        id: 'i1',
        businessId: 'b1',
        name: 'Widget',
        quantity: 5,
        createdBy: 'u1',
        createdAt: new Date('2026-01-21T10:00:00.000Z'),
        confirmedBy: null,
        confirmedAt: null,
        confirmedByApprentice: false,
      },
    ]);
    dataSource.getRepository.mockReturnValue({ find });

    const rows = await repo.findRecentInventory('b1', 10);

    expect(find).toHaveBeenCalledWith({
      where: { businessId: 'b1' },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    expect(rows[0].name).toBe('Widget');
  });

  it('findRecentInvites scopes by businessId', async () => {
    const find = jest.fn().mockResolvedValue([]);
    dataSource.getRepository.mockReturnValue({ find });

    await repo.findRecentInvites('b1', 10);

    expect(find).toHaveBeenCalledWith({
      where: { businessId: 'b1' },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  });

  it('resolveUserNames returns map and handles empty', async () => {
    const find = jest
      .fn()
      .mockResolvedValue([{ id: 'u1', firstName: 'A', lastName: 'B' }]);
    dataSource.getRepository.mockReturnValue({ find });

    const map = await repo.resolveUserNames(['u1']);
    expect(map.get('u1')).toBe('A B');
    expect(await repo.resolveUserNames([])).toEqual(new Map());
  });
});
