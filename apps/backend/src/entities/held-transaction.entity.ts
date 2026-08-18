import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('held_transactions')
export class HeldTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column()
  customerName!: string;

  @Column({ type: 'json' })
  items!: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;

  @Column({ type: 'uuid' })
  heldBy!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent!: number;

  @Column({
    type: 'enum',
    enum: ['cash', 'card', 'transfer', 'split', 'account'],
    default: 'cash',
  })
  paymentMethod!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => "CURRENT_TIMESTAMP + INTERVAL '24 hours'",
  })
  expiresAt!: Date;
}
