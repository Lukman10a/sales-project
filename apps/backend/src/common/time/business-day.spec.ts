import { businessDay } from './business-day';

describe('businessDay', () => {
  it('is the Lagos calendar day, an hour ahead of UTC', () => {
    // 23:30 UTC on 31 Dec is already 00:30 on 1 Jan in Lagos.
    expect(businessDay(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(businessDay(new Date('2026-12-31T22:59:00Z'))).toBe('2026-12-31');
  });
});
