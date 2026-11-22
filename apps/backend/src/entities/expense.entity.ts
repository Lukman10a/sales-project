import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { moneyColumn } from '../common/money/money';

export const EXPENSE_CATEGORIES = [
  'rent',
  'salaries',
  'fuel',
  'utilities',
  'transport',
  'supplies',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Money the business spent that is not stock (T37): rent, diesel, salaries.
 * Net profit is gross profit minus the expenses dated in the period.
 */
@Entity('expenses')
@Index('IDX_expenses_business_date', ['businessId', 'date'])
export class Expense {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_expenses_id',
  })
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column({ type: 'enum', enum: EXPENSE_CATEGORIES })
  category!: ExpenseCategory;

  /** Naira in the app, kobo in the database. */
  @Column(moneyColumn())
  amount!: number;

  /** The business-local day the money was spent (YYYY-MM-DD). */
  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  /** The user who recorded it. */
  @Column({ type: 'uuid' })
  recordedBy!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
