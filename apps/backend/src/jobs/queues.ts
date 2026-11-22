import type { JobsOptions } from 'bullmq';

/** Background work, by queue. The worker process (`start:worker`) runs them. */
export const QUEUES = ['email', 'digest', 'maintenance', 'webhooks'] as const;
export type QueueName = (typeof QUEUES)[number];

/** Jobs that failed every attempt. Holds what failed and why, never the data. */
export const DEAD_LETTER_QUEUE = 'dead-letter';

export const MAX_ATTEMPTS = 5;

/** Retries back off 30 s, 1 min, 2 min, 4 min before the job is dead-lettered. */
export const JOB_DEFAULTS: JobsOptions = {
  attempts: MAX_ATTEMPTS,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Scheduled jobs run on Lagos time. */
export const SCHEDULE_TIMEZONE = 'Africa/Lagos';

/**
 * Thrown by a job that cannot succeed on a retry (for example an email the
 * provider rejected as invalid), so it goes straight to the dead letters.
 */
export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentJobError';
  }
}

/** A job's error as one short line, safe to log and keep. */
export function failureReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 300);
}

/** Which process this is: the API, or the worker started by `start:worker`. */
export function processRole(): 'api' | 'worker' {
  return process.env.LUXA_PROCESS === 'worker' ? 'worker' : 'api';
}
