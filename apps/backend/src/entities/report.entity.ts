import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export const REPORT_TYPES = [
  'sales',
  'inventory',
  'profit',
  'expenses',
  'audit',
  'investor',
  'customer',
  'team',
  'custom',
] as const;

export const REPORT_FORMATS = ['pdf', 'csv', 'excel'] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportFormat = (typeof REPORT_FORMATS)[number];

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  businessId!: string;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: REPORT_TYPES,
  })
  type!: ReportType;

  @Column({
    type: 'enum',
    enum: REPORT_FORMATS,
  })
  format!: ReportFormat;

  @Column({ type: 'jsonb' })
  dateRange!: { start: string; end: string };

  @Column({ type: 'varchar', default: 'completed' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  snapshot?: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
