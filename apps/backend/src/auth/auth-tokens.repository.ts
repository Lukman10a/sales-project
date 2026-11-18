import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuthToken, AuthTokenPurpose } from '../entities/auth-token.entity';

@Injectable()
export class AuthTokensRepository extends Repository<AuthToken> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(AuthToken, dataSource.createEntityManager());
  }

  /** Marks every unused token of this purpose as used (superseded). */
  async invalidate(userId: string, purpose: AuthTokenPurpose): Promise<void> {
    await this.update(
      { userId, purpose, usedAt: IsNull() },
      { usedAt: new Date() },
    );
  }

  /**
   * Atomically spends a live token. Returns its owner, or null when the token
   * is unknown, already used, expired, or meant for another purpose.
   */
  async consume(
    tokenHash: string,
    purpose: AuthTokenPurpose,
  ): Promise<string | null> {
    const result = await this.createQueryBuilder()
      .update(AuthToken)
      .set({ usedAt: () => 'now()' })
      .where('"tokenHash" = :tokenHash', { tokenHash })
      .andWhere('purpose = :purpose', { purpose })
      .andWhere('"usedAt" IS NULL')
      .andWhere('"expiresAt" > now()')
      .returning(['userId'])
      .execute();
    const rows = result.raw as Array<{ userId: string }>;
    return rows[0]?.userId ?? null;
  }
}
