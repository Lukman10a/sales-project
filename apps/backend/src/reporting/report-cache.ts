import { Injectable } from '@nestjs/common';

/** How long a computed report is reused. Sales and refunds clear it sooner. */
export const REPORT_TTL_MS = 60_000;

/**
 * A short-lived cache of report results, per business. In memory for now,
 * so each API instance keeps its own; T39 moves it to Redis behind this
 * same interface.
 */
@Injectable()
export class ReportCache {
  private readonly entries = new Map<
    string,
    { expires: number; value: unknown }
  >();

  constructor(private readonly now: () => number = Date.now) {}

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

  /** Drops every cached report of one business. */
  invalidate(businessId: string): void {
    const prefix = `${businessId}:`;
    for (const id of this.entries.keys()) {
      if (id.startsWith(prefix)) this.entries.delete(id);
    }
  }

  private prune(): void {
    if (this.entries.size < 1000) return;
    const now = this.now();
    for (const [id, entry] of this.entries) {
      if (entry.expires <= now) this.entries.delete(id);
    }
  }
}
