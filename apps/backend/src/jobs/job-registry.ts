import { Injectable } from '@nestjs/common';
import { PermanentJobError, type QueueName } from './queues';

export type JobHandler = (data: unknown) => Promise<unknown>;

export interface JobSchedule {
  queue: QueueName;
  name: string;
  /** Cron pattern, on Lagos time. */
  pattern: string;
}

/**
 * What each job does, and which jobs run on a schedule. Modules register in
 * `onModuleInit`; the queue (inline) or the worker (BullMQ) looks handlers up
 * here, so the same code runs in either process.
 */
@Injectable()
export class JobRegistry {
  private readonly handlers = new Map<string, JobHandler>();
  private readonly scheduled = new Map<string, JobSchedule>();

  handle(queue: QueueName, name: string, handler: JobHandler): void {
    const id = `${queue}:${name}`;
    if (this.handlers.has(id)) throw new Error(`Job ${id} registered twice`);
    this.handlers.set(id, handler);
  }

  /** Runs the job on `pattern`, once across all instances (with Redis). */
  schedule(queue: QueueName, name: string, pattern: string): void {
    this.scheduled.set(`${queue}:${name}`, { queue, name, pattern });
  }

  run(queue: QueueName, name: string, data: unknown): Promise<unknown> {
    const handler = this.handlers.get(`${queue}:${name}`);
    if (!handler) {
      return Promise.reject(
        new PermanentJobError(`No handler for job ${queue}:${name}`),
      );
    }
    return handler(data);
  }

  schedules(): JobSchedule[] {
    return [...this.scheduled.values()];
  }
}
