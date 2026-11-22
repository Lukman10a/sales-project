import { Logger } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import { CronJob } from 'cron';
import { KEY_PREFIX } from '../common/redis/redis';
import type { JobRegistry } from './job-registry';
import {
  failureReason,
  JOB_DEFAULTS,
  MAX_ATTEMPTS,
  PermanentJobError,
  QUEUES,
  SCHEDULE_TIMEZONE,
  type QueueName,
} from './queues';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

/** Where code puts background work. */
export interface JobQueue {
  add(queue: QueueName, name: string, data: unknown): Promise<void>;
}

/** BullMQ's key prefix, inside the app's own. */
export const BULL_PREFIX = `${KEY_PREFIX}bull`;

/**
 * Jobs in Redis. They outlive the process that added them, are retried with
 * backoff, and run in the worker (`start:worker`).
 */
export class BullJobQueue implements JobQueue {
  private readonly queues: Map<QueueName, Queue>;

  constructor(
    connection: ConnectionOptions,
    make: (name: QueueName) => Queue = (name) =>
      new Queue(name, { connection, prefix: BULL_PREFIX }),
  ) {
    this.queues = new Map(QUEUES.map((q) => [q, make(q)]));
  }

  async add(queue: QueueName, name: string, data: unknown): Promise<void> {
    await this.queues.get(queue)!.add(name, data, JOB_DEFAULTS);
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}

/**
 * Jobs run in this process, for local development and tests (no Redis).
 * Same retries, shorter waits; nothing survives a restart, and schedules run
 * here (one instance only).
 */
export class InlineJobQueue implements JobQueue {
  private readonly logger = new Logger('Jobs');
  private readonly running = new Set<Promise<void>>();
  private crons: CronJob[] = [];

  constructor(
    private readonly registry: JobRegistry,
    private readonly retryDelayMs = 1000,
    private readonly attempts = MAX_ATTEMPTS,
  ) {}

  add(queue: QueueName, name: string, data: unknown): Promise<void> {
    const run = this.attempt(queue, name, data, 1).finally(() =>
      this.running.delete(run),
    );
    this.running.add(run);
    return Promise.resolve();
  }

  /** Waits for every job added so far (tests). */
  async drain(): Promise<void> {
    while (this.running.size) await Promise.all([...this.running]);
  }

  startSchedules(): void {
    this.crons = this.registry.schedules().map((s) =>
      CronJob.from({
        cronTime: s.pattern,
        timeZone: SCHEDULE_TIMEZONE,
        start: true,
        onTick: () => void this.add(s.queue, s.name, {}),
      }),
    );
  }

  stopSchedules(): void {
    for (const c of this.crons) void c.stop();
    this.crons = [];
  }

  private async attempt(
    queue: QueueName,
    name: string,
    data: unknown,
    n: number,
  ): Promise<void> {
    try {
      await this.registry.run(queue, name, data);
    } catch (err) {
      const reason = failureReason(err);
      if (n >= this.attempts || err instanceof PermanentJobError) {
        this.logger.error(
          `Job ${queue}:${name} failed after ${n} attempt(s), dead-lettered: ${reason}`,
        );
        return;
      }
      this.logger.warn(`Job ${queue}:${name} attempt ${n} failed: ${reason}`);
      const wait = this.retryDelayMs * 2 ** (n - 1);
      await new Promise((r) => setTimeout(r, wait));
      await this.attempt(queue, name, data, n + 1);
    }
  }
}
