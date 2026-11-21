import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Every action an audit event can describe (T34). */
export const AUDIT_ACTIONS = [
  'sale.recorded',
  'sale.refunded',
  'product.created',
  'product.updated',
  'product.price_changed',
  'product.stock_adjusted',
  'product.confirmed',
  'product.deleted',
  'product.imported',
  'expense.recorded',
  'expense.updated',
  'expense.deleted',
  'staff.invited',
  'staff.updated',
  'staff.role_changed',
  'staff.status_changed',
  'staff.permissions_changed',
  'staff.removed',
  'auth.signed_in',
  'auth.sign_in_failed',
  'two_factor.enabled',
  'two_factor.disabled',
  'two_factor.backup_codes_regenerated',
  'two_factor.requirement_changed',
  'session.revoked',
  'session.revoked_all',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * One append-only record of who did what in a business. Rows are never
 * updated or deleted: the app exposes no such path and the database rejects
 * both (see the AuditEvents migration).
 */
@Entity('audit_events')
@Index('IDX_audit_events_business_created', ['businessId', 'createdAt'])
@Index('IDX_audit_events_business_entity', [
  'businessId',
  'entityType',
  'entityId',
])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_audit_events_id',
  })
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  /** Null for actions without a signed-in actor. */
  @Column({ type: 'uuid', nullable: true })
  actorUserId!: string | null;

  /** The actor's name when it happened; kept even if they are renamed. */
  @Column({ type: 'varchar', length: 200 })
  actorName!: string;

  @Column({ type: 'enum', enum: AUDIT_ACTIONS })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 50 })
  entityType!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'uuid', nullable: true })
  sessionId!: string | null;

  /** Millisecond precision, so the (createdAt, id) cursor is exact. */
  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  createdAt!: Date;
}
