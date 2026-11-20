import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * One `Idempotency-Key` a client sent with `POST /sales`, kept for 24 hours:
 * a repeat with the same body gets the original sale back, a different body
 * is refused.
 */
@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ type: 'uuid' })
  businessId!: string;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  key!: string;

  /** sha256 of the request body, hex. */
  @Column({ type: 'varchar', length: 64 })
  requestHash!: string;

  @Column({ type: 'uuid', nullable: true })
  saleId!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
