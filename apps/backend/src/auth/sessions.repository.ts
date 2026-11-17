import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { Session, SessionRevokeReason } from '../entities/session.entity';

@Injectable()
export class SessionsRepository extends Repository<Session> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.findOne({ where: { tokenHash } });
  }

  /**
   * Atomically revokes one live row. Returns false when another request got
   * there first, so the caller can tell a race (or replay) from success.
   */
  async claim(id: string, reason: SessionRevokeReason): Promise<boolean> {
    const result = await this.update(
      { id, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
    return (result.affected ?? 0) > 0;
  }

  async revokeFamily(
    familyId: string,
    reason: SessionRevokeReason,
  ): Promise<number> {
    const result = await this.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
    return result.affected ?? 0;
  }

  async revokeFamilyForUser(
    userId: string,
    familyId: string,
    reason: SessionRevokeReason,
  ): Promise<number> {
    const result = await this.update(
      { userId, familyId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
    return result.affected ?? 0;
  }

  async revokeAllForUser(
    userId: string,
    reason: SessionRevokeReason,
  ): Promise<number> {
    const result = await this.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
    return result.affected ?? 0;
  }

  /** Live rows: one per signed-in device. */
  findActiveForUser(userId: string): Promise<Session[]> {
    return this.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { lastUsedAt: 'DESC' },
    });
  }

  isFamilyActive(familyId: string): Promise<boolean> {
    return this.exists({
      where: { familyId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
  }
}
