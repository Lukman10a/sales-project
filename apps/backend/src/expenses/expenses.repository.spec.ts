import type { DataSource } from 'typeorm';
import { TenantMismatchError } from '../common/tenancy/assert-tenant';
import type { Expense } from '../entities/expense.entity';
import { ExpensesRepository } from './expenses.repository';

describe('ExpensesRepository', () => {
  let manager: { query: jest.Mock };
  const sqlOf = (call: number) =>
    (manager.query.mock.calls as [string, unknown[]][])[call][0];
  let repository: ExpensesRepository;

  beforeEach(() => {
    manager = { query: jest.fn() };

    repository = new ExpensesRepository({
      createEntityManager: () => manager,
    } as unknown as DataSource);
  });

  it('totals kobo exactly and returns naira, scoped to the business', async () => {
    manager.query
      .mockResolvedValueOnce([
        { category: 'rent', kobo: '25000000' },
        { category: 'fuel', kobo: '1500050' },
      ])
      .mockResolvedValueOnce([
        { period: '2026-10', kobo: '25000000' },
        { period: '2026-11', kobo: '1500050' },
      ]);

    await expect(
      repository.totals('b1', '2026-10-01', '2026-11-30'),
    ).resolves.toEqual({
      total: 265000.5,
      byCategory: [
        { category: 'rent', amount: 250000 },
        { category: 'fuel', amount: 15000.5 },
      ],
      series: [
        { period: '2026-10', amount: 250000 },
        { period: '2026-11', amount: 15000.5 },
      ],
    });
    for (const [sql, params] of manager.query.mock.calls as [
      string,
      unknown[],
    ][]) {
      expect(sql).toContain('"businessId" = $1');
      expect(params).toEqual(['b1', '2026-10-01', '2026-11-30']);
    }
    expect(sqlOf(1)).toContain("date_trunc('month'");
  });

  it('groups by day when asked, with no expenses giving zero', async () => {
    manager.query.mockResolvedValue([]);

    const totals = await repository.totals(
      'b1',
      '2026-11-01',
      '2026-11-07',
      'day',
    );

    expect(totals).toEqual({ total: 0, byCategory: [], series: [] });
    expect(sqlOf(1)).toContain("'YYYY-MM-DD'");
  });

  it("refuses to save or remove another business's expense", async () => {
    const other = { id: 'e1', businessId: 'b2' } as Expense;
    await expect(repository.saveExpense('b1', other)).rejects.toThrow(
      TenantMismatchError,
    );
    await expect(repository.removeExpense('b1', other)).rejects.toThrow(
      TenantMismatchError,
    );
  });
});
