import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type SessionRevokeReason = 'rotated' | 'logout' | 'reuse' | 'revoked';

/**
 * One row per refresh token. Rotation revokes the presented row ('rotated')
 * and inserts its successor in the same family. A family is one signed-in
 * device. Its id is the `sid` carried by access tokens.
 */
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  /** SHA-256 (hex) of the opaque refresh token. The token itself is never stored. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  /** 'Trust this device': refresh cookie persists instead of ending with the browser. */
  @Column({ type: 'boolean', default: false })
  persistent!: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  deviceLabel!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  /** When the family (device sign-in) started; carried across rotations. */
  @Column({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  lastUsedAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  revokedReason!: SessionRevokeReason | null;
}
