import { NotFoundException } from '@nestjs/common';
import type { Expense } from '../entities/expense.entity';
import type { AuditService } from '../audit/audit.service';
import type { ExpensesRepository } from './expenses.repository';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const user = { id: 'u1', businessId: 'b1', name: 'Ada' };
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  let events: { emit: jest.Mock };
  let service: ExpensesService;

  const expense = (over: Partial<Expense> = {}): Expense =>
    ({
      id: 'e1',
      businessId: 'b1',
      category: 'fuel',
      amount: 15000,
      date: '2026-11-20',
      note: 'Diesel',
      recordedBy: 'u1',
      ...over,
    }) as Expense;

  beforeEach(() => {
    repo = {
      transaction: jest.fn((fn: () => Promise<unknown>) => fn()),
      list: jest.fn(),
      findById: jest.fn(),
      createExpense: jest.fn((_b: string, d: Partial<Expense>) => ({
        ...d,
        businessId: 'b1',
      })),
      saveExpense: jest.fn((_b: string, e: Expense) =>
        Promise.resolve({ ...e, id: e.id ?? 'e1' }),
      ),
      removeExpense: jest.fn().mockResolvedValue(undefined),
      totals: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    events = { emit: jest.fn() };
    service = new ExpensesService(
      repo as unknown as ExpensesRepository,
      audit as unknown as AuditService,
      events as unknown as EventEmitter2,
    );
  });

  it('records an expense for the caller and audits it', async () => {
    const saved = await service.create(user, {
      category: 'rent',
      amount: 250000,
      date: '2026-11-01',
      note: 'November',
    });

    expect(repo.createExpense).toHaveBeenCalledWith('b1', {
      category: 'rent',
      amount: 250000,
      date: '2026-11-01',
      note: 'November',
      recordedBy: 'u1',
    });
    expect(saved.id).toBe('e1');
    expect(events.emit).toHaveBeenCalledWith('expense.changed', {
      businessId: 'b1',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b1',
        action: 'expense.recorded',
        entityType: 'expense',
        entityId: 'e1',
        after: {
          category: 'rent',
          amount: 250000,
          date: '2026-11-01',
          note: 'November',
        },
      }),
    );
  });

  it('dates an expense today (Lagos) when no date is given', async () => {
    await service.create(user, { category: 'other', amount: 10 });
    const data = (
      repo.createExpense.mock.calls as [string, Partial<Expense>][]
    )[0][1];
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.note).toBeNull();
  });

  it('audits an edit with the values before and after', async () => {
    repo.findById.mockResolvedValue(expense());

    await service.update(user, 'e1', { amount: 18000, note: null });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'expense.updated',
        before: expect.objectContaining({
          amount: 15000,
          note: 'Diesel',
        }) as unknown,
        after: expect.objectContaining({
          amount: 18000,
          note: null,
        }) as unknown,
      }),
    );
  });

  it('audits a delete with what was removed', async () => {
    repo.findById.mockResolvedValue(expense());

    await expect(service.remove(user, 'e1')).resolves.toEqual({
      message: 'Expense deleted',
    });
    expect(repo.removeExpense).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ id: 'e1' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'expense.deleted',
        before: expect.objectContaining({ amount: 15000 }) as unknown,
      }),
    );
  });

  it("404s on another business's expense and writes nothing", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update(user, 'e9', { amount: 1 })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(user, 'e9')).rejects.toThrow(NotFoundException);
    expect(repo.findById).toHaveBeenCalledWith('b1', 'e9');
    expect(repo.saveExpense).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('summarises a period for the reports API', async () => {
    repo.totals.mockResolvedValue({ total: 5, byCategory: [], series: [] });

    await expect(
      service.summary('b1', {
        from: '2026-11-01',
        to: '2026-11-30',
        groupBy: 'day',
      }),
    ).resolves.toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
      total: 5,
      byCategory: [],
      series: [],
    });
    expect(repo.totals).toHaveBeenCalledWith(
      'b1',
      '2026-11-01',
      '2026-11-30',
      'day',
    );
  });
});
