import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({
    type: 'enum',
    enum: ['cash', 'card', 'transfer', 'split', 'account'],
    default: 'cash',
  })
  paymentMethod!: 'cash' | 'card' | 'transfer' | 'split' | 'account';

  @Column({
    type: 'enum',
    enum: ['completed', 'pending', 'refunded', 'partial-refund'],
    default: 'completed',
  })
  status!: 'completed' | 'pending' | 'refunded' | 'partial-refund';

  @Column({ type: 'date' })
  saleDate!: Date;

  @Column({ type: 'uuid' })
  soldBy!: string;

  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  customerName?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ nullable: true })
  refundReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.sales)
  owner!: User;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items!: SaleItem[];
}
