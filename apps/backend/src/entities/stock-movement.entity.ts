import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Why a product's stock changed (T36). */
export const STOCK_REASONS = [
  'sale',
  'refund',
  'restock',
  'adjustment',
  'import',
  'void',
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

/**
 * One append-only line of a product's stock history. A product's quantity
 * always equals the sum of its movements' deltas; the database refuses
 * UPDATE and DELETE (see the ProductsV2 migration).
 */
@Entity('stock_movements')
@Index('IDX_stock_movements_business_product', [
  'businessId',
  'productId',
  'createdAt',
])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_stock_movements_id',
  })
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  /** No foreign key: history outlives a deleted product. */
  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  delta!: number;

  @Column({ type: 'enum', enum: STOCK_REASONS })
  reason!: StockReason;

  /** What caused it, e.g. the sale id. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  refId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  createdAt!: Date;
}
