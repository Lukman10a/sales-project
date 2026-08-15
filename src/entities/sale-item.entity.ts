import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  saleId!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  sale!: Sale;
}
