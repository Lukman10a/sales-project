import type { DataSource, EntityManager } from 'typeorm';
import { AuditRepository } from './audit.repository';
import { AuditEvent } from '../entities/audit-event.entity';
import { runInTransaction } from '../common/transactions/transactions';

describe('AuditRepository', () => {
  let base: { save: jest.Mock; create: jest.Mock; connection: unknown };
  let repository: AuditRepository;

  beforeEach(() => {
    base = {
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_t: unknown, data: unknown) => data),
      connection: { getMetadata: () => ({ target: AuditEvent }) },
    };
    const dataSource = {
      createEntityManager: () => base,
    } as unknown as DataSource;
    repository = new AuditRepository(dataSource);
  });

  const event = {
    actorUserId: 'u1',
    actorName: 'Ada',
    action: 'sale.recorded' as const,
    entityType: 'sale',
    entityId: 's1',
    before: null,
    after: null,
    ip: null,
    userAgent: null,
    sessionId: null,
  };

  it('appends the event under the business', async () => {
    await repository.append('b1', event);
    expect(base.save).toHaveBeenCalledWith(
      AuditEvent,
      {
        ...event,
        businessId: 'b1',
      },
      undefined,
    );
  });

  it('writes through the surrounding transaction', async () => {
    const txSave = jest.fn().mockResolvedValue(undefined);
    const tx = {
      save: txSave,
      create: jest.fn((_t: unknown, data: unknown) => data),
      connection: { getMetadata: () => ({ target: AuditEvent }) },
    } as unknown as EntityManager;
    const dataSource = {
      transaction: (fn: (m: EntityManager) => Promise<unknown>) => fn(tx),
    } as unknown as DataSource;

    await runInTransaction(dataSource, () => repository.append('b1', event));

    expect(txSave).toHaveBeenCalled();
    expect(base.save).not.toHaveBeenCalled();
  });

  describe('list', () => {
    let qb: Record<string, jest.Mock>;

    beforeEach(() => {
      qb = {};
      for (const m of ['where', 'andWhere', 'orderBy', 'addOrderBy', 'take']) {
        qb[m] = jest.fn().mockReturnValue(qb);
      }
      qb.getMany = jest.fn().mockResolvedValue([]);
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
    });

    it('scopes to the business, newest first', async () => {
      await repository.list('b1', { limit: 5 });
      expect(qb.where).toHaveBeenCalledWith('e.businessId = :businessId', {
        businessId: 'b1',
      });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('e.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('e.id', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('applies every filter and the keyset cursor', async () => {
      const at = new Date('2026-11-01T00:00:00.000Z');
      await repository.list('b1', {
        actorUserId: 'u1',
        action: 'sale.refunded',
        entityType: 'sale',
        entityId: 's1',
        from: at,
        to: at,
        before: { createdAt: at, id: 'e9' },
        limit: 10,
      });
      const clauses = qb.andWhere.mock.calls.map((c: unknown[]) => c[0]);
      expect(clauses).toEqual([
        'e.actorUserId = :actorUserId',
        'e.action = :action',
        'e.entityType = :entityType',
        'e.entityId = :entityId',
        'e.createdAt >= :from',
        'e.createdAt <= :to',
        '(e.createdAt, e.id) < (:beforeAt, :beforeId)',
      ]);
    });
  });

  it('pages the business trail with a total', async () => {
    const findAndCount = jest
      .spyOn(repository, 'findAndCount')
      .mockResolvedValue([[], 0]);
    await repository.page('b1', 3, 20);
    expect(findAndCount).toHaveBeenCalledWith({
      where: { businessId: 'b1' },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: 40,
      take: 20,
    });
  });
});
