import {
  formatNaira,
  fromKobo,
  nairaSql,
  nairaTransformer,
  splitPaymentsTransformer,
  toKobo,
} from './money';

describe('money', () => {
  it('converts naira to kobo exactly for two-decimal amounts', () => {
    expect(toKobo(0.01)).toBe(1);
    expect(toKobo(0.1 + 0.2)).toBe(30);
    expect(toKobo(1.25)).toBe(125);
    expect(toKobo(4500)).toBe(450000);
    expect(toKobo(-12.34)).toBe(-1234);
  });

  it('round-trips without float error', () => {
    for (const naira of [0, 0.01, 0.99, 19.99, 3800, 123456.78]) {
      expect(fromKobo(toKobo(naira))).toBe(naira);
    }
  });

  it('handles large totals within the safe-integer range', () => {
    const naira = 90_000_000_000.12; // ₦90 billion
    expect(fromKobo(toKobo(naira))).toBe(naira);
    expect(() => toKobo(1e15)).toThrow(RangeError);
  });

  it('reads the string form pg returns for bigint', () => {
    expect(fromKobo('1370000')).toBe(13700);
  });

  it('rejects non-finite input', () => {
    expect(() => toKobo(Number.NaN)).toThrow(RangeError);
    expect(() => fromKobo('12.5')).toThrow(RangeError);
  });

  it('formats naira for display', () => {
    expect(formatNaira(13700)).toBe('₦13,700');
    expect(formatNaira(0.5)).toBe('₦0.50');
  });

  it('transforms columns both ways and keeps nulls', () => {
    expect(nairaTransformer.to(10.5)).toBe(1050);
    expect(nairaTransformer.from('1050')).toBe(10.5);
    expect(nairaTransformer.to(null)).toBeNull();
    expect(nairaTransformer.from(null)).toBeNull();
  });

  it('wraps SQL expressions to return naira', () => {
    expect(nairaSql('SUM(s.total)')).toBe('(SUM(s.total)) / 100.0');
  });
});

describe('splitPaymentsTransformer', () => {
  it('stores amounts as kobo and reads them back as naira', () => {
    const naira = [
      { method: 'cash', amount: 1000.5 },
      { method: 'card', amount: 0.01 },
    ];
    const stored = splitPaymentsTransformer.to(naira) as typeof naira;
    expect(stored.map((p) => p.amount)).toEqual([100050, 1]);
    expect(splitPaymentsTransformer.from(stored)).toEqual(naira);
    expect(splitPaymentsTransformer.to(undefined)).toBeUndefined();
  });
});
