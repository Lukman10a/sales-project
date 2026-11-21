import { ReportCache } from './report-cache';

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

    cache.invalidate('b1');

    await expect(
      cache.wrap('b1', 'k', () => Promise.resolve('new')),
    ).resolves.toBe('new');
    await expect(
      cache.wrap('b2', 'k', () => Promise.resolve('x')),
    ).resolves.toBe('two');
  });
});
