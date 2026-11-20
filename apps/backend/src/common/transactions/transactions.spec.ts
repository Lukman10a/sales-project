import type { DataSource, EntityManager } from 'typeorm';
import {
  TransactionRunner,
  TransactionalRepository,
  activeManager,
  runInTransaction,
} from './transactions';

class Thing {}
class ThingRepository extends TransactionalRepository<Thing> {}

describe('transactions', () => {
  const base = { name: 'base' } as unknown as EntityManager;
  const txManager = { name: 'tx' } as unknown as EntityManager;
  let transaction: jest.Mock;
  let dataSource: DataSource;

  beforeEach(() => {
    transaction = jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
      fn(txManager),
    );
    dataSource = { transaction } as unknown as DataSource;
  });

  it('exposes the transaction manager only inside the unit of work', async () => {
    expect(activeManager()).toBeUndefined();
    await runInTransaction(dataSource, () => {
      expect(activeManager()).toBe(txManager);
      return Promise.resolve();
    });
    expect(activeManager()).toBeUndefined();
  });

  it('joins an outer transaction instead of opening another', async () => {
    const runner = new TransactionRunner(dataSource);
    await runner.run(() => runner.run(() => Promise.resolve('inner')));
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('points repositories at the active transaction', async () => {
    const repo = new ThingRepository(Thing, base);
    expect(repo.manager).toBe(base);
    await runInTransaction(dataSource, () => {
      expect(repo.manager).toBe(txManager);
      return Promise.resolve();
    });
    expect(repo.manager).toBe(base);
  });

  it('propagates failures so the transaction rolls back', async () => {
    await expect(
      runInTransaction(dataSource, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
  });
});
