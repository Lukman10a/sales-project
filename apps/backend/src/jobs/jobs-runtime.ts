import {
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { ConnectionOptions } from 'bullmq';
import type { JobRegistry } from './job-registry';
import { BullJobQueue, InlineJobQueue, type JobQueue } from './job-queue';
import { JobWorker } from './job-worker';

interface RuntimeOptions {
  registry: JobRegistry;
  /** Null without REDIS_URL. */
  connection: ConnectionOptions | null;
  role: 'api' | 'worker';
  nodeEnv: string | undefined;
}

/**
 * Picks how jobs run:
 * - with Redis, the API only adds jobs and the worker process runs them;
 * - without Redis, they run inline in this process (development, tests).
 */
export class JobsRuntime
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('Jobs');
  readonly queue: JobQueue;
  private worker: JobWorker | null = null;

  constructor(
    private readonly options: RuntimeOptions,
    make: {
      worker?: (registry: JobRegistry, c: ConnectionOptions) => JobWorker;
      queue?: (c: ConnectionOptions) => BullJobQueue;
    } = {},
  ) {
    const { registry, connection, role } = options;
    if (role === 'worker' && !connection) {
      throw new Error('The worker needs REDIS_URL');
    }
    const makeQueue = make.queue ?? ((c) => new BullJobQueue(c));
    const makeWorker = make.worker ?? ((r, c) => new JobWorker(r, c));
    this.queue = connection
      ? makeQueue(connection)
      : new InlineJobQueue(registry);
    if (role === 'worker' && connection) {
      this.worker = makeWorker(registry, connection);
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.worker) {
      await this.worker.start();
    } else if (this.queue instanceof InlineJobQueue) {
      if (this.options.nodeEnv === 'production') {
        this.logger.warn(
          'REDIS_URL is not set: jobs run in the API process and are lost on restart',
        );
      }
      // Tests drive jobs themselves; a running cron would hold the process open.
      if (this.options.nodeEnv !== 'test') this.queue.startSchedules();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    if (this.queue instanceof BullJobQueue) await this.queue.close();
    if (this.queue instanceof InlineJobQueue) this.queue.stopSchedules();
  }
}
