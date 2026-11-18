import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TwoFactorBackupCode } from '../../entities/two-factor-backup-code.entity';

@Injectable()
export class BackupCodesRepository extends Repository<TwoFactorBackupCode> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(TwoFactorBackupCode, dataSource.createEntityManager());
  }

  /** Swaps the user's whole set of codes for a new one, atomically. */
  async replaceForUser(userId: string, codeHashes: string[]): Promise<void> {
    await this.manager.transaction(async (tx) => {
      await tx.delete(TwoFactorBackupCode, { userId });
      await tx.insert(
        TwoFactorBackupCode,
        codeHashes.map((codeHash) => ({ userId, codeHash, usedAt: null })),
      );
    });
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.delete({ userId });
  }

  /**
   * Spends one unused code. A single conditional UPDATE, so two requests
   * racing with the same code cannot both succeed.
   */
  async consume(userId: string, codeHash: string): Promise<boolean> {
    const result = await this.createQueryBuilder()
      .update(TwoFactorBackupCode)
      .set({ usedAt: () => 'now()' })
      .where('"userId" = :userId', { userId })
      .andWhere('"codeHash" = :codeHash', { codeHash })
      .andWhere('"usedAt" IS NULL')
      .execute();
    return (result.affected ?? 0) === 1;
  }

  countUnused(userId: string): Promise<number> {
    return this.count({ where: { userId, usedAt: IsNull() } });
  }
}
