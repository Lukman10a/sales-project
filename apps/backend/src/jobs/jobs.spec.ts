import { Logger } from '@nestjs/common';
import { UnrecoverableError, type ConnectionOptions, type Job } from 'bullmq';
import { JobRegistry } from './job-registry';
import { BullJobQueue, InlineJobQueue } from './job-queue';
import { JobWorker } from './job-worker';
import { JobsRuntime } from './jobs-runtime';
import {
  DEAD_LETTER_QUEUE,
  failureReason,
  JOB_DEFAULTS,
  PermanentJobError,
  processRole,
  QUEUES,
} from './queues';

beforeEach(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const connection = {} as ConnectionOptions;

describe('JobRegistry', () => {
  it('runs the handler registered for a job', async () => {
    const registry = new JobRegistry();
    const handler = jest.fn().mockResolvedValue('done');
    registry.handle('email', 'send', handler);

    await expect(registry.run('email', 'send', { a: 1 })).resolves.toBe('done');
    expect(handler).toHaveBeenCalledWith({ a: 1 });
  });

  it('refuses a second handler and fails an unknown job permanently', async () => {
    const registry = new JobRegistry();
    registry.handle('email', 'send', jest.fn());
    expect(() => registry.handle('email', 'send', jest.fn())).toThrow(/twice/);
    await expect(registry.run('digest', 'nope', {})).rejects.toBeInstanceOf(
      PermanentJobError,
    );
  });

  it('lists schedules once per job', () => {
    const registry = new JobRegistry();
    registry.schedule('digest', 'ai-digest', '0 7 * * *');
    registry.schedule('digest', 'ai-digest', '0 8 * * *');
    expect(registry.schedules()).toEqual([
      { queue: 'digest', name: 'ai-digest', pattern: '0 8 * * *' },
    ]);
  });
});

describe('InlineJobQueue', () => {
  it('runs a job in the background and retries until it succeeds', async () => {
    const registry = new JobRegistry();
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValue(undefined);
    registry.handle('email', 'send', handler);
    const queue = new InlineJobQueue(registry, 0);

    await queue.add('email', 'send', { to: 'a@b.co' });
    await queue.drain();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('gives up after the last attempt, or at once on a permanent error', async () => {
    const registry = new JobRegistry();
    const failing = jest.fn().mockRejectedValue(new Error('down'));
    const permanent = jest
      .fn()
      .mockRejectedValue(new PermanentJobError('bad address'));
    registry.handle('email', 'a', failing);
    registry.handle('email', 'b', permanent);
    const queue = new InlineJobQueue(registry, 0, 3);

    await queue.add('email', 'a', {});
    await queue.add('email', 'b', {});
    await queue.drain();

    expect(failing).toHaveBeenCalledTimes(3);
    expect(permanent).toHaveBeenCalledTimes(1);
  });

  it('starts and stops in-process schedules', () => {
    const registry = new JobRegistry();
    registry.schedule('maintenance', 'stock-integrity', '30 2 * * *');
    const queue = new InlineJobQueue(registry);
    queue.startSchedules();
    queue.stopSchedules();
  });
});

describe('BullJobQueue', () => {
  it('adds jobs with retries and backoff to the named queue', async () => {
    const queues: Record<string, { add: jest.Mock; close: jest.Mock }> = {};
    const bull = new BullJobQueue(connection, (name) => {
      queues[name] = { add: jest.fn(), close: jest.fn() };
      return queues[name] as never;
    });

    await bull.add('email', 'send', { to: 'a@b.co' });
    await bull.close();

    expect(Object.keys(queues)).toEqual([...QUEUES]);
    expect(queues.email.add).toHaveBeenCalledWith(
      'send',
      { to: 'a@b.co' },
      JOB_DEFAULTS,
    );
    expect(JOB_DEFAULTS).toMatchObject({
      attempts: 5,
      backoff: { type: 'exponential' },
    });
    expect(queues.digest.close).toHaveBeenCalled();
  });
});

describe('JobWorker', () => {
  function setup() {
    const registry = new JobRegistry();
    const processors: Record<string, (job: Job) => Promise<unknown>> = {};
    const onFailed: Record<string, (job: Job, err: Error) => void> = {};
    const queues: Record<
      string,
      { add: jest.Mock; close: jest.Mock; upsertJobScheduler: jest.Mock }
    > = {};
    const worker = new JobWorker(registry, connection, {
      worker: (name, process) => {
        processors[name] = process;
        return {
          on: jest.fn((event: string, fn: (job: Job, err: Error) => void) => {
            if (event === 'failed') onFailed[name] = fn;
          }),
          close: jest.fn(),
        } as never;
      },
      queue: (name) => {
        queues[name] ??= {
          add: jest.fn(),
          close: jest.fn(),
          upsertJobScheduler: jest.fn(),
        };
        return queues[name] as never;
      },
    });
    return { registry, worker, processors, onFailed, queues };
  }

  const job = (over: Partial<Job> = {}) =>
    ({
      id: 'j1',
      name: 'send',
      data: { link: 'secret-token' },
      attemptsMade: 5,
      opts: { attempts: 5 },
      ...over,
    }) as Job;

  it('runs every queue and upserts each schedule on Lagos time', async () => {
    const { registry, worker, processors, queues } = setup();
    const send = jest.fn().mockResolvedValue('ok');
    registry.handle('email', 'send', send);
    registry.schedule('digest', 'ai-digest', '0 7 * * *');

    await worker.start();

    expect(Object.keys(processors)).toEqual([...QUEUES]);
    await expect(processors.email(job())).resolves.toBe('ok');
    expect(queues.digest.upsertJobScheduler).toHaveBeenCalledWith(
      'ai-digest',
      { pattern: '0 7 * * *', tz: 'Africa/Lagos' },
      expect.objectContaining({ name: 'ai-digest' }),
    );
    await worker.close();
  });

  it('turns a permanent error into one BullMQ will not retry', async () => {
    const { registry, worker, processors } = setup();
    registry.handle('email', 'send', () =>
      Promise.reject(new PermanentJobError('rejected')),
    );
    await worker.start();

    await expect(processors.email(job())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('dead-letters a job that used every attempt, without its data', async () => {
    const { worker, onFailed, queues } = setup();
    await worker.start();

    onFailed.email(job(), new Error('Resend responded 500'));
    await Promise.resolve();

    const [name, letter] = queues[DEAD_LETTER_QUEUE].add.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe('failed');
    expect(letter).toMatchObject({
      queue: 'email',
      name: 'send',
      jobId: 'j1',
      attempts: 5,
      reason: 'Resend responded 500',
    });
    expect(JSON.stringify(letter)).not.toContain('secret-token');
  });

  it('only logs a failure that will be retried', async () => {
    const { worker, onFailed, queues } = setup();
    await worker.start();

    onFailed.email(job({ attemptsMade: 2 }), new Error('timeout'));
    await Promise.resolve();

    expect(queues[DEAD_LETTER_QUEUE].add).not.toHaveBeenCalled();
  });
});

describe('JobsRuntime', () => {
  const registry = () => new JobRegistry();

  it('runs jobs inline without Redis, with schedules outside tests', async () => {
    const r = registry();
    const runtime = new JobsRuntime({
      registry: r,
      connection: null,
      role: 'api',
      nodeEnv: 'development',
    });
    const start = jest.spyOn(runtime.queue as InlineJobQueue, 'startSchedules');

    expect(runtime.queue).toBeInstanceOf(InlineJobQueue);
    await runtime.onApplicationBootstrap();
    expect(start).toHaveBeenCalled();
    await runtime.onApplicationShutdown();
  });

  it('never starts schedules in tests', async () => {
    const runtime = new JobsRuntime({
      registry: registry(),
      connection: null,
      role: 'api',
      nodeEnv: 'test',
    });
    const start = jest.spyOn(runtime.queue as InlineJobQueue, 'startSchedules');
    await runtime.onApplicationBootstrap();
    expect(start).not.toHaveBeenCalled();
  });

  it('only adds jobs in the API, and processes them in the worker', async () => {
    const fakeWorker = { start: jest.fn(), close: jest.fn() };
    const worker = jest.fn(() => fakeWorker as unknown as JobWorker);
    const close = jest.fn();
    const queue = jest.fn(
      () =>
        Object.assign(Object.create(BullJobQueue.prototype), {
          close,
        }) as BullJobQueue,
    );

    const api = new JobsRuntime(
      { registry: registry(), connection, role: 'api', nodeEnv: 'production' },
      { worker, queue },
    );
    expect(api.queue).toBeInstanceOf(BullJobQueue);
    expect(worker).not.toHaveBeenCalled();
    await api.onApplicationBootstrap();
    await api.onApplicationShutdown();
    expect(close).toHaveBeenCalledTimes(1);

    const w = new JobsRuntime(
      {
        registry: registry(),
        connection,
        role: 'worker',
        nodeEnv: 'production',
      },
      { worker, queue },
    );
    await w.onApplicationBootstrap();
    await w.onApplicationShutdown();
    expect(fakeWorker.start).toHaveBeenCalled();
    expect(fakeWorker.close).toHaveBeenCalled();
  });

  it('refuses to start a worker without Redis', () => {
    expect(
      () =>
        new JobsRuntime({
          registry: registry(),
          connection: null,
          role: 'worker',
          nodeEnv: 'production',
        }),
    ).toThrow(/REDIS_URL/);
  });
});

describe('queue helpers', () => {
  it('knows which process it is in', () => {
    const before = process.env.LUXA_PROCESS;
    process.env.LUXA_PROCESS = 'worker';
    expect(processRole()).toBe('worker');
    delete process.env.LUXA_PROCESS;
    expect(processRole()).toBe('api');
    if (before !== undefined) process.env.LUXA_PROCESS = before;
  });

  it('keeps a failure reason short', () => {
    expect(failureReason(new Error('x'.repeat(500)))).toHaveLength(300);
    expect(failureReason('plain')).toBe('plain');
  });
});
