import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** A product category, named once per business (T36). */
@Entity('categories')
@Index('UQ_categories_business_name', ['businessId', 'name'], { unique: true })
export class Category {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_categories_id',
  })
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
