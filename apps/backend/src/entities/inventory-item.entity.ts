import { moneyColumn } from '../common/money/money';
import {
  AfterLoad,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';

@Entity('inventory_items')
@Index('UQ_inventory_items_business_barcode', ['businessId', 'barcode'], {
  unique: true,
  where: '"barcode" IS NOT NULL',
})
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column()
  name!: string;

  /** Loaded only when asked for (the list and detail reads do). */
  @ManyToMany(() => Category)
  @JoinTable({
    name: 'product_categories',
    joinColumn: {
      name: 'productId',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_product_categories_product',
    },
    inverseJoinColumn: {
      name: 'categoryId',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_product_categories_category',
    },
  })
  categories?: Category[];

  /** Category names, filled from `categories` whenever those are loaded. */
  category?: string[];

  @AfterLoad()
  exposeCategoryNames() {
    if (this.categories) this.category = this.categories.map((c) => c.name);
  }

  @Column({ nullable: true })
  sku?: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ nullable: true })
  description?: string;

  @Column(moneyColumn())
  costPrice!: number;

  @Column(moneyColumn())
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
  cartonSize?: number;

  @Column(moneyColumn({ nullable: true }))
  cartonPrice?: number;

  /** YYYY-MM-DD. */
  @Column({ type: 'date', nullable: true })
  expiryDate?: string | null;

  @Column({ type: 'int', default: 0 })
  sold!: number;

  @Column({
    type: 'enum',
    enum: ['in-stock', 'low-stock', 'out-of-stock'],
    default: 'in-stock',
  })
  status!: 'in-stock' | 'low-stock' | 'out-of-stock';

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
