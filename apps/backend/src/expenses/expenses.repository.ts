import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  TransactionalRepository,
  runInTransaction,
} from '../common/transactions/transactions';
import { assertTenant } from '../common/tenancy/assert-tenant';
import { fromKobo } from '../common/money/money';
import { Expense, type ExpenseCategory } from '../entities/expense.entity';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

export interface ExpenseListQuery {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  page: number;
  limit: number;
}

export interface ExpenseTotals {
  /** Naira. */
  total: number;
  byCategory: Array<{ category: ExpenseCategory; amount: number }>;
  /** Period keys are YYYY-MM-DD (day) or YYYY-MM (month), ascending. */
  series: Array<{ period: string; amount: number }>;
}

const PERIOD_FORMAT = { day: 'YYYY-MM-DD', month: 'YYYY-MM' } as const;

/** Tenant-owned: every method takes `businessId` first. */
@Injectable()
export class ExpensesRepository extends TransactionalRepository<Expense> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(Expense, dataSource.createEntityManager());
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return runInTransaction(this.dataSource, fn);
  }

  async list(
    businessId: string,
    query: ExpenseListQuery,
  ): Promise<PaginatedResult<Expense>> {
    const qb = this.createQueryBuilder('e').where(
      'e.businessId = :businessId',
      {
        businessId,
      },
    );
    if (query.from) qb.andWhere('e.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('e.date <= :to', { to: query.to });
    if (query.category) {
      qb.andWhere('e.category = :category', { category: query.category });
    }
    const [data, total] = await qb
      .orderBy('e.date', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  findById(businessId: string, id: string): Promise<Expense | null> {
    return this.findOne({ where: { id, businessId } });
  }

  createExpense(
    businessId: string,
    data: Omit<Partial<Expense>, 'businessId'>,
  ): Expense {
    return this.create({ ...data, businessId });
  }

  async saveExpense(businessId: string, expense: Expense): Promise<Expense> {
    assertTenant(businessId, expense);
    return this.save(expense);
  }

  async removeExpense(businessId: string, expense: Expense): Promise<void> {
    assertTenant(businessId, expense);
    await this.remove(expense);
  }

  /** Spending dated from `from` to `to` (inclusive), by category and period. */
  async totals(
    businessId: string,
    from: string,
    to: string,
    groupBy: 'day' | 'month' = 'month',
  ): Promise<ExpenseTotals> {
    // Interpolated below, so only ever one of these two literals.
    const unit = groupBy === 'day' ? 'day' : 'month';
    const params = [businessId, from, to];
    const where = `"businessId" = $1 AND "date" BETWEEN $2 AND $3`;
    const byCategory = await this.manager.query<
      Array<{ category: ExpenseCategory; kobo: string }>
    >(
      `SELECT "category", SUM("amount")::text AS "kobo"
       FROM "expenses" WHERE ${where}
       GROUP BY "category" ORDER BY SUM("amount") DESC, "category"`,
      params,
    );
    const series = await this.manager.query<
      Array<{ period: string; kobo: string }>
    >(
      `SELECT to_char(date_trunc('${unit}', "date"), '${PERIOD_FORMAT[unit]}') AS "period",
              SUM("amount")::text AS "kobo"
       FROM "expenses" WHERE ${where}
       GROUP BY 1 ORDER BY 1`,
      params,
    );

    const totalKobo = byCategory.reduce((sum, r) => sum + BigInt(r.kobo), 0n);
    return {
      total: fromKobo(totalKobo),
      byCategory: byCategory.map((r) => ({
        category: r.category,
        amount: fromKobo(r.kobo),
      })),
      series: series.map((r) => ({
        period: r.period,
        amount: fromKobo(r.kobo),
      })),
    };
  }
}
