import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One-time recovery codes for two-step verification. Only a keyed digest
 * (HMAC-SHA256) is stored; the codes themselves are shown once.
 */
@Entity('two_factor_backup_codes')
export class TwoFactorBackupCode {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_two_factor_backup_codes_id',
  })
  id!: string;

  @Index('IDX_two_factor_backup_codes_userId')
  @Column({ type: 'uuid' })
  userId!: string;

  @Index('IDX_two_factor_backup_codes_codeHash', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  codeHash!: string;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
