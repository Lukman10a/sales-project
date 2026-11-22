import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Session } from '../entities/session.entity';
import { SessionsRepository } from './sessions.repository';
import { deviceLabel } from './device-label';

/** Where a request came from; stored for the device list. */
export interface ClientContext {
  userAgent?: string;
  ip?: string;
}

export interface IssuedRefresh {
  /** Opaque token for the refresh cookie. Only its hash is stored. */
  refreshToken: string;
  /** The session (device) id, carried as `sid` in access tokens. */
  familyId: string;
  persistent: boolean;
  expiresAt: Date;
}

export interface SessionView {
  id: string;
  deviceLabel: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  current: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** 'Trust this device': 30 days, renewed on every refresh. */
export const REMEMBERED_TTL_MS = 30 * DAY_MS;
/** Otherwise the cookie ends with the browser and the server caps it at a day. */
export const SESSION_TTL_MS = DAY_MS;

export const hashToken = (raw: string) =>
  createHash('sha256').update(raw).digest('hex');

const newToken = () => randomBytes(32).toString('base64url');

const ttl = (persistent: boolean) =>
  persistent ? REMEMBERED_TTL_MS : SESSION_TTL_MS;

const clip = (value: string | undefined, max: number) =>
  value ? value.slice(0, max) : null;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger('AuthAudit');

  constructor(private readonly sessions: SessionsRepository) {}

  /** Starts a new session family at sign-in. */
  async start(
    user: { id: string; businessId: string },
    ctx: ClientContext,
    persistent: boolean,
  ): Promise<IssuedRefresh> {
    const now = new Date();
    const familyId = randomUUID();
    return this.insert({
      userId: user.id,
      businessId: user.businessId,
      familyId,
      persistent,
      createdAt: now,
      ctx,
      now,
    });
  }

  /**
   * Exchanges a refresh token for its successor. A token that was already
   * rotated means it leaked (or was replayed), so the whole family is
   * revoked and the event is audited.
   */
  async rotate(
    rawToken: string,
    ctx: ClientContext,
  ): Promise<{ userId: string; issued: IssuedRefresh }> {
    const row = await this.sessions.findByTokenHash(hashToken(rawToken));
    if (!row) throw new UnauthorizedException('Invalid refresh token');

    if (row.revokedAt) {
      if (row.revokedReason === 'rotated') await this.reuse(row, ctx);
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired');
    }
    if (!(await this.sessions.claim(row.id, 'rotated'))) {
      // Lost the race to another request presenting the same token.
      await this.reuse(row, ctx);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const issued = await this.insert({
      userId: row.userId,
      businessId: row.businessId,
      familyId: row.familyId,
      persistent: row.persistent,
      createdAt: row.createdAt,
      ctx,
      now: new Date(),
    });
    return { userId: row.userId, issued };
  }

  isActive(familyId: string): Promise<boolean> {
    return this.sessions.isFamilyActive(familyId);
  }

  async revoke(familyId: string): Promise<void> {
    await this.sessions.revokeFamily(familyId, 'logout');
  }

  async revokeAll(userId: string): Promise<number> {
    return this.sessions.revokeAllForUser(userId, 'logout');
  }

  /** Ends every session of the user except one (e.g. after a password change). */
  async revokeOthers(userId: string, keepFamilyId?: string): Promise<number> {
    if (!keepFamilyId) return this.sessions.revokeAllForUser(userId, 'revoked');
    return this.sessions.revokeAllForUserExcept(
      userId,
      keepFamilyId,
      'revoked',
    );
  }

  async revokeOne(userId: string, familyId: string): Promise<void> {
    const affected = await this.sessions.revokeFamilyForUser(
      userId,
      familyId,
      'revoked',
    );
    if (affected === 0) throw new NotFoundException('Session not found');
  }

  async list(userId: string, currentFamilyId?: string): Promise<SessionView[]> {
    const rows = await this.sessions.findActiveForUser(userId);
    return rows.map((row) => ({
      id: row.familyId,
      deviceLabel: row.deviceLabel,
      userAgent: row.userAgent,
      ip: row.ip,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      current: row.familyId === currentFamilyId,
    }));
  }

  private async reuse(row: Session, ctx: ClientContext): Promise<void> {
    const revoked = await this.sessions.revokeFamily(row.familyId, 'reuse');
    this.logger.warn(
      JSON.stringify({
        event: 'auth.refresh_token_reuse',
        userId: row.userId,
        businessId: row.businessId,
        sessionId: row.familyId,
        revoked,
        ip: ctx.ip ?? null,
      }),
    );
  }

  private async insert(input: {
    userId: string;
    businessId: string;
    familyId: string;
    persistent: boolean;
    createdAt: Date;
    ctx: ClientContext;
    now: Date;
  }): Promise<IssuedRefresh> {
    const refreshToken = newToken();
    const expiresAt = new Date(input.now.getTime() + ttl(input.persistent));
    await this.sessions.save(
      this.sessions.create({
        userId: input.userId,
        businessId: input.businessId,
        tokenHash: hashToken(refreshToken),
        familyId: input.familyId,
        persistent: input.persistent,
        deviceLabel: deviceLabel(input.ctx.userAgent),
        userAgent: clip(input.ctx.userAgent, 512),
        ip: clip(input.ctx.ip, 64),
        createdAt: input.createdAt,
        lastUsedAt: input.now,
        expiresAt,
        revokedAt: null,
        revokedReason: null,
      }),
    );
    return {
      refreshToken,
      familyId: input.familyId,
      persistent: input.persistent,
      expiresAt,
    };
  }
}
