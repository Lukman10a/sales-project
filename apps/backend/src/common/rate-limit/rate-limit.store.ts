export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export interface RateLimitHit {
  /** Hits in the current window, including this one. */
  count: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
}

/** Fixed-window counters. In memory now; T39 adds a Redis implementation. */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitHit>;
}

/**
 * Per-process store. Expired windows are pruned lazily on writes, so no timer
 * keeps the process alive. Counters are per instance until T39 moves them to
 * Redis.
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
