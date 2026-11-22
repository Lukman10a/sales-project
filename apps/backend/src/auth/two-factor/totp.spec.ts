import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  otpauthUri,
  stepAt,
  totpAt,
  verifyTotp,
} from './totp';

// RFC 6238 appendix B uses the ASCII secret "12345678901234567890" (SHA-1).
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('totp', () => {
  it('round-trips base32', () => {
    const bytes = Buffer.from('any bytes \x00\xff here');
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
    expect(base32Decode('mzxw 6ytb-oi')).toEqual(Buffer.from('foobar'));
  });

  it('rejects non-base32 input', () => {
    expect(() => base32Decode('not*base32')).toThrow();
  });

  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC 6238 vector at T=%i', (seconds, code) => {
    expect(totpAt(RFC_SECRET, seconds * 1000)).toBe(code);
  });

  it('accepts the current code and one step of drift either way', () => {
    const now = 1234567890_000;
    const step = stepAt(now);
    expect(verifyTotp(RFC_SECRET, '005924', { now })).toBe(step);
    const previous = totpAt(RFC_SECRET, now - 30_000);
    const next = totpAt(RFC_SECRET, now + 30_000);
    expect(verifyTotp(RFC_SECRET, previous, { now })).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, next, { now })).toBe(step + 1);
    const stale = totpAt(RFC_SECRET, now - 90_000);
    expect(verifyTotp(RFC_SECRET, stale, { now })).toBeNull();
  });

  it('refuses a code from a step that was already used', () => {
    const now = 1234567890_000;
    const step = stepAt(now);
    expect(
      verifyTotp(RFC_SECRET, '005924', { now, lastStep: step }),
    ).toBeNull();
    expect(verifyTotp(RFC_SECRET, '005924', { now, lastStep: step - 1 })).toBe(
      step,
    );
  });

  it('refuses malformed codes', () => {
    expect(verifyTotp(RFC_SECRET, '12345')).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBeNull();
    expect(verifyTotp(RFC_SECRET, '1234567')).toBeNull();
  });

  it('generates distinct 160-bit secrets', () => {
    const a = generateTotpSecret();
    expect(base32Decode(a)).toHaveLength(20);
    expect(generateTotpSecret()).not.toBe(a);
  });

  it('builds an otpauth URI with the issuer and account', () => {
    const uri = otpauthUri({
      secret: 'ABC',
      account: 'ada@shop.ng',
      issuer: 'LUXA',
    });
    expect(uri.startsWith('otpauth://totp/LUXA%3Aada%40shop.ng?')).toBe(true);
    const params = new URL(uri).searchParams;
    expect(params.get('secret')).toBe('ABC');
    expect(params.get('issuer')).toBe('LUXA');
    expect(params.get('digits')).toBe('6');
  });
});
