import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { Permission, UserRole } from '../common/constants/permissions';
import { KEY_PREFIX } from '../common/redis/redis';

/**
 * Who is making a request, resolved from the database rather than from the
 * token, so a permission change or a deactivation applies on the very next
 * request.
 */
export interface Principal {
  id: string;
  /** Display name, for the audit trail. */
  name: string;
  email: string;
  role: UserRole;
  businessId: string;
  businessName: string;
  permissions: Permission[];
  maxDiscountPercent: number;
}

export const PRINCIPAL_CACHE = Symbol('PRINCIPAL_CACHE');

/**
 * Short-lived principal cache. Writers call `delete` whenever what a
 * principal can do changes. In Redis every API instance sees the delete; the
 * in-memory fallback is per process.
 */
export interface PrincipalCache {
  get(userId: string): Promise<Principal | undefined>;
  set(userId: string, principal: Principal): Promise<void>;
  delete(userId: string): Promise<void>;
}

export const PRINCIPAL_TTL_MS = 30_000;

export class MemoryPrincipalCache implements PrincipalCache {
  private readonly entries = new Map<
    string,
    { principal: Principal; expiresAt: number }
  >();

  constructor(
    private readonly ttlMs = PRINCIPAL_TTL_MS,
    private readonly now = () => Date.now(),
  ) {}

  get(userId: string): Promise<Principal | undefined> {
    const entry = this.entries.get(userId);
    if (entry && entry.expiresAt <= this.now()) this.entries.delete(userId);
    return Promise.resolve(
      entry && entry.expiresAt > this.now() ? entry.principal : undefined,
    );
  }

  set(userId: string, principal: Principal): Promise<void> {
    this.entries.set(userId, {
      principal,
      expiresAt: this.now() + this.ttlMs,
    });
    return Promise.resolve();
  }

  delete(userId: string): Promise<void> {
    this.entries.delete(userId);
    return Promise.resolve();
  }
}

/**
 * Principals in Redis, shared by every instance. If Redis is unreachable a
 * read is a miss (the database answers instead), so requests keep working.
 */
export class RedisPrincipalCache implements PrincipalCache {
  private readonly logger = new Logger('PrincipalCache');

  constructor(
    private readonly redis: Pick<Redis, 'get' | 'set' | 'del'>,
    private readonly ttlMs = PRINCIPAL_TTL_MS,
  ) {}

  private key(userId: string) {
    return `${KEY_PREFIX}principal:${userId}`;
  }

  async get(userId: string): Promise<Principal | undefined> {
    try {
      const raw = await this.redis.get(this.key(userId));
      return raw ? (JSON.parse(raw) as Principal) : undefined;
    } catch (err) {
      this.warn('read', err);
      return undefined;
    }
  }

  async set(userId: string, principal: Principal): Promise<void> {
    try {
      await this.redis.set(
        this.key(userId),
        JSON.stringify(principal),
        'PX',
        this.ttlMs,
      );
    } catch (err) {
      this.warn('write', err);
    }
  }

  /**
   * Called after a change in access has committed, so a failure must not fail
   * the request: it is logged as an error, and the entry still expires within
   * the TTL.
   */
  async delete(userId: string): Promise<void> {
    try {
      await this.redis.del(this.key(userId));
    } catch (err) {
      this.logger.error(
        `Could not clear cached access for user ${userId}; it expires within ${this.ttlMs / 1000}s: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private warn(what: string, err: unknown) {
    this.logger.warn(
      `Principal cache ${what} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
