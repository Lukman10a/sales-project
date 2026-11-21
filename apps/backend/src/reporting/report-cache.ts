import { Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { KEY_PREFIX } from '../common/redis/redis';

/** How long a computed report is reused. Sales and refunds clear it sooner. */
export const REPORT_TTL_MS = 60_000;

/**
 * A short-lived cache of report results, per business: in Redis when
 * configured (shared by every API instance), else in memory.
 */
export abstract class ReportStore {
  abstract wrap<T>(
    businessId: string,
    key: string,
    compute: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T>;

  /** Drops every cached report of one business. */
  abstract invalidate(businessId: string): Promise<void>;
}

/** Per-process fallback for local development and tests. */
@Injectable()
export class ReportCache extends ReportStore {
  private readonly entries = new Map<
    string,
    { expires: number; value: unknown }
  >();

  constructor(private readonly now: () => number = Date.now) {
    super();
  }

  async wrap<T>(
    businessId: string,
    key: string,
    compute: () => Promise<T>,
    ttlMs = REPORT_TTL_MS,
  ): Promise<T> {
    const id = `${businessId}:${key}`;
    const hit = this.entries.get(id);
    if (hit && hit.expires > this.now()) return hit.value as T;
    const value = await compute();
    this.entries.set(id, { expires: this.now() + ttlMs, value });
    this.prune();
    return value;
  }

  invalidate(businessId: string): Promise<void> {
    const prefix = `${businessId}:`;
    for (const id of this.entries.keys()) {
      if (id.startsWith(prefix)) this.entries.delete(id);
    }
    return Promise.resolve();
  }

  private prune(): void {
    if (this.entries.size < 1000) return;
    const now = this.now();
    for (const [id, entry] of this.entries) {
      if (entry.expires <= now) this.entries.delete(id);
    }
  }
}

/**
 * Reports in Redis. Each business has a version number in its keys;
 * invalidating bumps the version, so old entries are never read again and
 * expire on their own. A Redis failure only means computing the report.
 */
export class RedisReportCache extends ReportStore {
  private readonly logger = new Logger('ReportCache');

  constructor(private readonly redis: Pick<Redis, 'get' | 'set' | 'incr'>) {
    super();
  }

  private versionKey(businessId: string) {
    return `${KEY_PREFIX}report:v:${businessId}`;
  }

  async wrap<T>(
    businessId: string,
    key: string,
    compute: () => Promise<T>,
    ttlMs = REPORT_TTL_MS,
  ): Promise<T> {
    let id: string | null = null;
    try {
      const version = (await this.redis.get(this.versionKey(businessId))) ?? 0;
      id = `${KEY_PREFIX}report:${businessId}:${version}:${key}`;
      const hit = await this.redis.get(id);
      if (hit) return JSON.parse(hit) as T;
    } catch (err) {
      this.warn(err);
    }
    const value = await compute();
    if (id) {
      try {
        await this.redis.set(id, JSON.stringify(value), 'PX', ttlMs);
      } catch (err) {
        this.warn(err);
      }
    }
    return value;
  }

  async invalidate(businessId: string): Promise<void> {
    try {
      await this.redis.incr(this.versionKey(businessId));
    } catch (err) {
      this.logger.error(
        `Could not clear cached reports for ${businessId}; they expire within ${REPORT_TTL_MS / 1000}s: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private warn(err: unknown) {
    this.logger.warn(
      `Report cache unavailable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
