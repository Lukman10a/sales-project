import {
  addDays,
  businessTime,
  daysIn,
  eachDay,
  percentChange,
  previousRange,
  resolvePeriod,
} from './periods';

describe('report periods', () => {
  it('does calendar-day arithmetic across months and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysIn({ from: '2026-11-01', to: '2026-11-30' })).toBe(30);
    expect(eachDay({ from: '2026-12-30', to: '2027-01-02' })).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
    expect(previousRange({ from: '2026-11-08', to: '2026-11-14' })).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
    });
  });

  describe('around Lagos midnight (UTC+1)', () => {
    it('is already tomorrow at 23:30 UTC', () => {
      const p = resolvePeriod('today', new Date('2026-11-20T23:30:00Z'));
      expect(p).toEqual({
        from: '2026-11-21',
        to: '2026-11-21',
        previous: { from: '2026-11-14', to: '2026-11-14' },
        cutoff: '00:30:00',
      });
    });

    it('is still today at 22:59 UTC', () => {
      const p = resolvePeriod('today', new Date('2026-11-20T22:59:59Z'));
      expect(p.from).toBe('2026-11-20');
      expect(p.cutoff).toBe('23:59:59');
    });

    it('starts a new month at 23:00 UTC on the last day', () => {
      const p = resolvePeriod('month', new Date('2026-11-30T23:00:00Z'));
      expect(p).toMatchObject({ from: '2026-12-01', to: '2026-12-01' });
      expect(p.previous).toEqual({ from: '2026-11-01', to: '2026-11-01' });
    });
  });

  it('compares the last 7 days with the 7 before', () => {
    expect(resolvePeriod('7d', new Date('2026-11-20T12:00:00Z'))).toEqual({
      from: '2026-11-14',
      to: '2026-11-20',
      previous: { from: '2026-11-07', to: '2026-11-13' },
    });
  });

  it('clamps month-to-date to the shorter previous month', () => {
    const p = resolvePeriod('month', new Date('2026-03-31T12:00:00Z'));
    expect(p).toMatchObject({ from: '2026-03-01', to: '2026-03-31' });
    expect(p.previous).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    const jan = resolvePeriod('month', new Date('2027-01-15T12:00:00Z'));
    expect(jan.previous).toEqual({ from: '2026-12-01', to: '2026-12-15' });
  });

  it('reads the Lagos time of day', () => {
    expect(businessTime(new Date('2026-11-20T06:05:09Z'))).toBe('07:05:09');
  });

  it('gives a percentage change, or null from nothing', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 200)).toBe(-75);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(1, 3)).toBe(-66.7);
  });
});
