import { moneyColumn } from '../common/money/money';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Sale } from './sale.entity';

export const SALE_UNITS = ['unit', 'carton'] as const;
export type SaleUnit = (typeof SALE_UNITS)[number];

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  saleId!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column()
  productName!: string;

  /** Sold by the single unit or by the carton (`cartonPrice`). */
  @Column({ type: 'enum', enum: SALE_UNITS, default: 'unit' })
  unit!: SaleUnit;

  /** How many of `unit` were sold. */
  @Column({ type: 'int' })
  quantity!: number;

  /** Stock units one `unit` takes from inventory (carton size, or 1). */
  @Column({ type: 'int', default: 1 })
  unitsPerItem!: number;

  /** How many of `quantity` have been refunded so far. */
  @Column({ type: 'int', default: 0 })
  refundedQuantity!: number;

  /** Catalogue price of one `unit`, read by the server at sale time. */
  @Column(moneyColumn())
  price!: number;

  @Column(moneyColumn())
  total!: number;

  /**
   * Cost of one stock unit at sale time (the product's cost price then).
   * Cost of goods sold = (quantity - refundedQuantity) * unitsPerItem * unitCost.
   */
  @Column({ ...moneyColumn(), default: 0 })
  unitCost!: number;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  sale!: Sale;
}
