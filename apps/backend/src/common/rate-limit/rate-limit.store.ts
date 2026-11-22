import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { KEY_PREFIX } from '../redis/redis';

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export interface RateLimitHit {
  /** Hits in the current window, including this one. */
  count: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
}

/** Fixed-window counters: in Redis when configured, else in memory. */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitHit>;
}

/**
 * Per-process store. Expired windows are pruned lazily on writes, so no timer
 * keeps the process alive. Counters are per instance: the fallback when
 * there is no Redis.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, RateLimitHit>();
  private writes = 0;

  constructor(private readonly now: () => number = Date.now) {}

  hit(key: string, windowMs: number): Promise<RateLimitHit> {
    const now = this.now();
    if (++this.writes % 1000 === 0) this.prune(now);

    const current = this.windows.get(key);
    const next =
      current && current.resetAt > now
        ? { count: current.count + 1, resetAt: current.resetAt }
        : { count: 1, resetAt: now + windowMs };
    this.windows.set(key, next);
    return Promise.resolve({ ...next });
  }

  get size(): number {
    return this.windows.size;
  }

  private prune(now: number) {
    for (const [key, hit] of this.windows) {
      if (hit.resetAt <= now) this.windows.delete(key);
    }
  }
}

/** Count, and start the window on the first hit, in one atomic step. */
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}
`;

/**
 * Counters in Redis, shared by every API instance. If Redis is unreachable
 * the request is let through (and logged): an outage must not lock everyone
 * out of the app.
 */
export class RedisRateLimitStore implements RateLimitStore {
  private readonly logger = new Logger('RateLimit');

  constructor(
    private readonly redis: Pick<Redis, 'eval'>,
    private readonly now: () => number = Date.now,
  ) {}

  async hit(key: string, windowMs: number): Promise<RateLimitHit> {
    try {
      const [count, ttl] = (await this.redis.eval(
        HIT_SCRIPT,
        1,
        `${KEY_PREFIX}rl:${key}`,
        windowMs,
      )) as [number, number];
      return { count: Number(count), resetAt: this.now() + Number(ttl) };
    } catch (err) {
      this.logger.error(
        `Rate limit store unavailable, allowing the request: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { count: 0, resetAt: this.now() + windowMs };
    }
  }
}
