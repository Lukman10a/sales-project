import { MemoryRateLimitStore } from './rate-limit.store';

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
