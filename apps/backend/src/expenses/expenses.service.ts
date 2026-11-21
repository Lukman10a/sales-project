import { Injectable, NotFoundException } from '@nestjs/common';
import type { Expense } from '../entities/expense.entity';
import { AuditService } from '../audit/audit.service';
import type { CurrentUserPayload } from '../common';
import { businessDay } from '../common/time/business-day';
import { ExpensesRepository, type ExpenseTotals } from './expenses.repository';
import type {
  CreateExpenseDto,
  ExpenseSummaryQuery,
  QueryExpensesDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

/** Who is acting, for the audit trail. */
type Actor = Pick<CurrentUserPayload, 'id' | 'businessId'> &
  Partial<Pick<CurrentUserPayload, 'name' | 'email' | 'sessionId'>>;

/** Expense fields the audit trail records. */
const snapshot = (e: Expense) => ({
  category: e.category,
  amount: e.amount,
  date: e.date,
  note: e.note,
});

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly audit: AuditService,
  ) {}

  list(user: { businessId: string }, query: QueryExpensesDto) {
    return this.expenses.list(user.businessId, query);
  }

  findOne(user: { businessId: string }, id: string): Promise<Expense> {
    return this.mustFind(user.businessId, id);
  }

  create(user: Actor, dto: CreateExpenseDto): Promise<Expense> {
    const businessId = user.businessId;
    return this.expenses.transaction(async () => {
      const saved = await this.expenses.saveExpense(
        businessId,
        this.expenses.createExpense(businessId, {
          category: dto.category,
          amount: dto.amount,
          date: dto.date ?? businessDay(),
          note: dto.note || null,
          recordedBy: user.id,
        }),
      );
      await this.audit.record({
        businessId,
        actor: user,
        action: 'expense.recorded',
        entityType: 'expense',
        entityId: saved.id,
        after: snapshot(saved),
      });
      return saved;
    });
  }

  update(user: Actor, id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const businessId = user.businessId;
    return this.expenses.transaction(async () => {
      const expense = await this.mustFind(businessId, id);
      const before = snapshot(expense);
      if (dto.category !== undefined) expense.category = dto.category;
      if (dto.amount !== undefined) expense.amount = dto.amount;
      if (dto.date !== undefined) expense.date = dto.date;
      if (dto.note !== undefined) expense.note = dto.note || null;
      const saved = await this.expenses.saveExpense(businessId, expense);
      await this.audit.record({
        businessId,
        actor: user,
        action: 'expense.updated',
        entityType: 'expense',
        entityId: id,
        before,
        after: snapshot(saved),
      });
      return saved;
    });
  }

  remove(user: Actor, id: string): Promise<{ message: string }> {
    const businessId = user.businessId;
    return this.expenses.transaction(async () => {
      const expense = await this.mustFind(businessId, id);
      const before = snapshot(expense);
      await this.expenses.removeExpense(businessId, expense);
      await this.audit.record({
        businessId,
        actor: user,
        action: 'expense.deleted',
        entityType: 'expense',
        entityId: id,
        before,
      });
      return { message: 'Expense deleted' };
    });
  }

  /**
   * Spending in a period, by category and by day or month. The reports API
   * (T38) subtracts `total` from gross profit for net profit.
   */
  summary(
    businessId: string,
    query: ExpenseSummaryQuery,
  ): Promise<ExpenseTotals & { from: string; to: string }> {
    return this.expenses
      .totals(businessId, query.from, query.to, query.groupBy)
      .then((totals) => ({ from: query.from, to: query.to, ...totals }));
  }

  private async mustFind(businessId: string, id: string): Promise<Expense> {
    const expense = await this.expenses.findById(businessId, id);
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }
}
