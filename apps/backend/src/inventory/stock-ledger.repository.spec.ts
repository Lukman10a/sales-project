import type { DataSource, EntityManager } from 'typeorm';
import { runInTransaction } from '../common/transactions/transactions';
import { TenantMismatchError } from '../common/tenancy/assert-tenant';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import {
  NegativeStockError,
  StockLedgerRepository,
} from './stock-ledger.repository';

describe('StockLedgerRepository', () => {
  let manager: { query: jest.Mock; insert: jest.Mock; find: jest.Mock };
  let repository: StockLedgerRepository;
  let dataSource: DataSource;

  const product = () =>
    ({
      id: 'p1',
      businessId: 'b1',
      name: 'Rice',
      quantity: 10,
      sold: 2,
      status: 'in-stock',
    }) as InventoryItem;

  /** Runs `fn` inside a (fake) transaction, as the services do. */
  const inTx = <T>(fn: () => Promise<T>) =>
    runInTransaction(dataSource, () => fn());

  beforeEach(() => {
    manager = {
      query: jest.fn(),
      insert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
    };
    dataSource = {
      createEntityManager: () => manager,
      transaction: (fn: (m: EntityManager) => Promise<unknown>) =>
        fn(manager as unknown as EntityManager),
    } as unknown as DataSource;
    repository = new StockLedgerRepository(dataSource);
  });

  describe('move', () => {
    it('updates stock relatively and appends the movement', async () => {
      manager.query.mockResolvedValue([
        [{ quantity: 7, sold: 5, status: 'in-stock' }],
        1,
      ]);
      const p = product();

      await inTx(() =>
        repository.move('b1', p, {
          delta: -3,
          reason: 'sale',
          refId: 's1',
          actorUserId: 'u1',
          soldDelta: 3,
        }),
      );

      const [sql, params] = manager.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('"quantity" = "quantity" + $3');
      expect(sql).toContain('"quantity" + $3 >= 0');
      expect(params).toEqual(['p1', 'b1', -3, 3, false]);
      expect(p).toMatchObject({ quantity: 7, sold: 5 });
      expect(manager.insert).toHaveBeenCalledWith(StockMovement, {
        businessId: 'b1',
        productId: 'p1',
        delta: -3,
        reason: 'sale',
        refId: 's1',
        actorUserId: 'u1',
        note: null,
      });
    });

    it('marks a restock so the restock date moves', async () => {
      manager.query.mockResolvedValue([
        { quantity: 15, sold: 2, status: 'in-stock' },
      ]);
      await inTx(() =>
        repository.move('b1', product(), { delta: 5, reason: 'restock' }),
      );
      expect((manager.query.mock.calls[0] as unknown[][])[1][4]).toBe(true);
    });

    it('refuses to go below zero and records nothing', async () => {
      manager.query.mockResolvedValue([[], 0]);
      await expect(
        inTx(() =>
          repository.move('b1', product(), {
            delta: -11,
            reason: 'adjustment',
          }),
        ),
      ).rejects.toThrow(NegativeStockError);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('only runs inside a transaction', async () => {
      await expect(
        repository.move('b1', product(), { delta: 1, reason: 'restock' }),
      ).rejects.toThrow('inside a transaction');
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('refuses a zero or fractional change', async () => {
      for (const delta of [0, 1.5]) {
        await expect(
          inTx(() =>
            repository.move('b1', product(), { delta, reason: 'import' }),
          ),
        ).rejects.toThrow('non-zero whole');
      }
    });

    it('refuses a product of another business', async () => {
      await expect(
        inTx(() =>
          repository.move('b2', product(), { delta: 1, reason: 'restock' }),
        ),
      ).rejects.toThrow(TenantMismatchError);
    });
  });

  describe('history', () => {
    it('reads the business product movements newest first', async () => {
      manager.find.mockResolvedValue([]);
      await repository.history('b1', 'p1', 20);
      expect(manager.find).toHaveBeenCalledWith(StockMovement, {
        where: { businessId: 'b1', productId: 'p1' },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: 20,
      });
    });
  });

  describe('mismatches', () => {
    it('returns products whose quantity is not the sum of their movements', async () => {
      manager.query.mockResolvedValue([
        {
          businessId: 'b1',
          productId: 'p1',
          name: 'Rice',
          quantity: 9,
          ledger: '10',
        },
      ]);

      await expect(repository.mismatches()).resolves.toEqual([
        {
          businessId: 'b1',
          productId: 'p1',
          name: 'Rice',
          quantity: 9,
          ledger: 10,
        },
      ]);
      const [sql, params] = manager.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain(
        'HAVING p."quantity" <> COALESCE(SUM(m."delta"), 0)',
      );
      expect(params).toEqual([null]);

      await repository.mismatches('b1');
      expect((manager.query.mock.calls[1] as unknown[][])[1]).toEqual(['b1']);
    });
  });
});
