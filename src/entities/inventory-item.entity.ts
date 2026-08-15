import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  category!: string[];

  @Column({ nullable: true })
  sku?: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  wholesalePrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellingPrice!: number;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'int', nullable: true })
  reorderPoint?: number;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ type: 'date', nullable: true })
  lastRestocked?: Date;

  @Column({ nullable: true })
  image?: string;

  @Column({ type: 'int', nullable: true })
  bundleQuantity?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  bundlePrice?: number;

  @Column({ type: 'int', default: 0 })
  sold!: number;

  @Column({
    type: 'enum',
    enum: ['in-stock', 'low-stock', 'out-of-stock'],
    default: 'in-stock',
  })
  status!: 'in-stock' | 'low-stock' | 'out-of-stock';

  @Column({ default: false })
  confirmedByApprentice!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'uuid' })
  createdBy!: string;

  // Relations
  @ManyToOne(() => User, (user) => user.inventory)
  owner!: User;
}
