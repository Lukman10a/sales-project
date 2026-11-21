import { Logger } from '@nestjs/common';
import { MemoryRateLimitStore, RedisRateLimitStore } from './rate-limit.store';

describe('MemoryRateLimitStore', () => {
  let now: number;
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    now = 1_000_000;
    store = new MemoryRateLimitStore(() => now);
  });

  it('counts hits within a window', async () => {
    await store.hit('k', 60_000);
    await store.hit('k', 60_000);
    await expect(store.hit('k', 60_000)).resolves.toEqual({
      count: 3,
      resetAt: now + 60_000,
    });
  });

  it('starts a new window once the old one expires', async () => {
    await store.hit('k', 60_000);
    now += 60_000;
    await expect(store.hit('k', 60_000)).resolves.toMatchObject({ count: 1 });
  });

  it('keeps keys independent', async () => {
    await store.hit('a', 60_000);
    await expect(store.hit('b', 60_000)).resolves.toMatchObject({ count: 1 });
  });

  it('prunes expired windows as it writes', async () => {
    for (let i = 0; i < 999; i++) await store.hit(`old-${i}`, 1);
    now += 10;
    await store.hit('fresh', 60_000);
    expect(store.size).toBe(1);
  });
});

describe('RedisRateLimitStore', () => {
  /** Runs the same fixed-window logic the Lua script does. */
  function fakeRedis(clock: { now: number }) {
    const windows = new Map<string, { count: number; expires: number }>();
    return {
      eval: jest.fn(
        (_script: string, _keys: number, key: string, windowMs: number) => {
          const w = windows.get(key);
          const next =
            w && w.expires > clock.now
              ? { count: w.count + 1, expires: w.expires }
              : { count: 1, expires: clock.now + windowMs };
          windows.set(key, next);
          return Promise.resolve([next.count, next.expires - clock.now]);
        },
      ),
    };
  }

  it('counts hits in one window per key, shared through Redis', async () => {
    const clock = { now: 1000 };
    const redis = fakeRedis(clock);
    const store = new RedisRateLimitStore(redis as never, () => clock.now);

    await expect(store.hit('login:1.2.3.4', 60_000)).resolves.toEqual({
      count: 1,
      resetAt: 61_000,
    });
    clock.now = 2000;
    await expect(store.hit('login:1.2.3.4', 60_000)).resolves.toEqual({
      count: 2,
      resetAt: 61_000,
    });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('INCR'),
      1,
      'luxa:rl:login:1.2.3.4',
      60_000,
    );
  });

  it('lets requests through when Redis is down', async () => {
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const store = new RedisRateLimitStore(
      { eval: () => Promise.reject(new Error('ECONNREFUSED')) },
      () => 0,
    );

    await expect(store.hit('k', 1000)).resolves.toEqual({
      count: 0,
      resetAt: 1000,
    });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
