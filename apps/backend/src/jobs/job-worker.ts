import { Logger } from '@nestjs/common';
import {
  Queue,
  UnrecoverableError,
  Worker,
  type ConnectionOptions,
  type Job,
} from 'bullmq';
import type { JobRegistry } from './job-registry';
import { BULL_PREFIX } from './job-queue';
import {
  DEAD_LETTER_QUEUE,
  failureReason,
  JOB_DEFAULTS,
  MAX_ATTEMPTS,
  PermanentJobError,
  QUEUES,
  SCHEDULE_TIMEZONE,
  type QueueName,
} from './queues';

/** What a dead letter keeps: enough to find and replay the job, no data. */
export interface DeadLetter {
  queue: QueueName;
  name: string;
  jobId: string | undefined;
  attempts: number;
  reason: string;
  failedAt: string;
}

interface Factories {
  worker: (
    name: QueueName,
    process: (job: Job) => Promise<unknown>,
  ) => Pick<Worker, 'on' | 'close'>;
  queue: (name: string) => Pick<Queue, 'add' | 'close' | 'upsertJobScheduler'>;
}

/**
 * The worker process's side of the queues: runs each job through the
 * registry, retries it with backoff, and dead-letters it when retries run out.
 * It also owns the schedules, so a scheduled job runs once however many API
 * instances there are.
 */
export class JobWorker {
  private readonly logger = new Logger('Worker');
  private workers: Array<Pick<Worker, 'on' | 'close'>> = [];
  private readonly deadLetters: Pick<Queue, 'add' | 'close'>;
  private readonly make: Factories;

  constructor(
    private readonly registry: JobRegistry,
    connection: ConnectionOptions,
    make?: Partial<Factories>,
  ) {
    this.make = {
      worker: (name, process) =>
        new Worker(name, process, {
          connection,
          prefix: BULL_PREFIX,
          concurrency: 5,
        }),
      queue: (name) => new Queue(name, { connection, prefix: BULL_PREFIX }),
      ...make,
    };
    this.deadLetters = this.make.queue(DEAD_LETTER_QUEUE);
  }

  async start(): Promise<void> {
    for (const name of QUEUES) {
      const worker = this.make.worker(name, (job) => this.process(name, job));
      worker.on('failed', (job: Job | undefined, err: Error) => {
        void this.failed(name, job, err);
      });
      this.workers.push(worker);
    }
    await this.schedule();
    this.logger.log(`Processing queues: ${QUEUES.join(', ')}`);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.deadLetters.close();
    this.workers = [];
  }

  private async process(queue: QueueName, job: Job): Promise<unknown> {
    try {
      return await this.registry.run(queue, job.name, job.data);
    } catch (err) {
      // BullMQ skips the remaining retries for an UnrecoverableError.
      if (err instanceof PermanentJobError) {
        throw new UnrecoverableError(err.message);
      }
      throw err;
    }
  }

  private async failed(
    queue: QueueName,
    job: Job | undefined,
    err: Error,
  ): Promise<void> {
    const attempts = job?.attemptsMade ?? 0;
    const allowed = job?.opts.attempts ?? MAX_ATTEMPTS;
    const reason = failureReason(err);
    if (err instanceof UnrecoverableError || attempts >= allowed) {
      const letter: DeadLetter = {
        queue,
        name: job?.name ?? 'unknown',
        jobId: job?.id,
        attempts,
        reason,
        failedAt: new Date().toISOString(),
      };
      this.logger.error(
        `Job ${queue}:${letter.name} (${letter.jobId}) dead-lettered after ${attempts} attempt(s): ${reason}`,
      );
      await this.deadLetters.add('failed', letter, {
        removeOnComplete: false,
        removeOnFail: false,
      });
    } else {
      this.logger.warn(
        `Job ${queue}:${job?.name} (${job?.id}) attempt ${attempts} failed: ${reason}`,
      );
    }
  }

  /** Creates or updates each schedule; one per id, so restarts never double it. */
  private async schedule(): Promise<void> {
    const queues = new Map<
      QueueName,
      Pick<Queue, 'upsertJobScheduler' | 'close'>
    >();
    for (const s of this.registry.schedules()) {
      const queue = queues.get(s.queue) ?? this.make.queue(s.queue);
      queues.set(s.queue, queue);
      await queue.upsertJobScheduler(
        s.name,
        { pattern: s.pattern, tz: SCHEDULE_TIMEZONE },
        { name: s.name, data: {}, opts: JOB_DEFAULTS },
      );
      this.logger.log(`Scheduled ${s.queue}:${s.name} at "${s.pattern}"`);
    }
    await Promise.all([...queues.values()].map((q) => q.close()));
  }
}
