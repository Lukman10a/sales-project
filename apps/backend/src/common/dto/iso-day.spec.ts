import { isoDay } from './iso-day';

describe('isoDay', () => {
  it('accepts real calendar days only', () => {
    expect(isoDay.safeParse('2028-02-29').success).toBe(true);
    for (const bad of ['2026-02-29', '2026-13-45', '2026-1-5', 'today']) {
      expect(isoDay.safeParse(bad).success).toBe(false);
    }
  });
});
