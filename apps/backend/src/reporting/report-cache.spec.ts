import { Logger } from '@nestjs/common';
import { RedisReportCache, ReportCache } from './report-cache';

describe('ReportCache', () => {
  let clock: number;
  let cache: ReportCache;

  beforeEach(() => {
    clock = 1_000;
    cache = new ReportCache(() => clock);
  });

  it('reuses a result until it expires', async () => {
    const compute = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await expect(cache.wrap('b1', 'k', compute, 100)).resolves.toBe(1);
    clock += 99;
    await expect(cache.wrap('b1', 'k', compute, 100)).resolves.toBe(1);
    clock += 1;
    await expect(cache.wrap('b1', 'k', compute, 100)).resolves.toBe(2);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('keeps businesses apart and clears one business only', async () => {
    await cache.wrap('b1', 'k', () => Promise.resolve('one'));
    await cache.wrap('b2', 'k', () => Promise.resolve('two'));

    await cache.invalidate('b1');

    await expect(
      cache.wrap('b1', 'k', () => Promise.resolve('new')),
    ).resolves.toBe('new');
    await expect(
      cache.wrap('b2', 'k', () => Promise.resolve('x')),
    ).resolves.toBe('two');
  });
});

describe('RedisReportCache', () => {
  function fakeRedis() {
    const store = new Map<string, string>();
    return {
      store,
      get: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve('OK');
      }),
      incr: jest.fn((k: string) => {
        const n = Number(store.get(k) ?? 0) + 1;
        store.set(k, String(n));
        return Promise.resolve(n);
      }),
    };
  }

  it('reuses a report until the business changes, then computes again', async () => {
    const redis = fakeRedis();
    const cache = new RedisReportCache(redis as never);
    const compute = jest
      .fn()
      .mockResolvedValueOnce({ sales: 1 })
      .mockResolvedValueOnce({ sales: 2 });

    await expect(cache.wrap('b1', 'summary', compute)).resolves.toEqual({
      sales: 1,
    });
    await expect(cache.wrap('b1', 'summary', compute)).resolves.toEqual({
      sales: 1,
    });
    expect(redis.set).toHaveBeenCalledWith(
      'luxa:report:b1:0:summary',
      '{"sales":1}',
      'PX',
      60_000,
    );

    await cache.invalidate('b1');
    await expect(cache.wrap('b1', 'summary', compute)).resolves.toEqual({
      sales: 2,
    });
    expect(compute).toHaveBeenCalledTimes(2);
    expect(redis.store.has('luxa:report:b1:1:summary')).toBe(true);
  });

  it('keeps each business separate', async () => {
    const cache = new RedisReportCache(fakeRedis() as never);
    await cache.wrap('b1', 'k', () => Promise.resolve('one'));
    await expect(
      cache.wrap('b2', 'k', () => Promise.resolve('two')),
    ).resolves.toBe('two');
  });

  it('computes the report when Redis is down', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const down = () => Promise.reject(new Error('ECONNREFUSED'));
    const cache = new RedisReportCache({
      get: down,
      set: down,
      incr: down,
    });

    await expect(cache.wrap('b1', 'k', () => Promise.resolve(7))).resolves.toBe(
      7,
    );
    await expect(cache.invalidate('b1')).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });
});
