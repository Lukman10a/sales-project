import { randomBytes } from 'node:crypto';
import { SecretBox, parseEncryptionKey } from './secret-box';

describe('SecretBox', () => {
  const box = new SecretBox(randomBytes(32));

  it('seals to ciphertext that opens to the original', () => {
    const sealed = box.seal('JBSWY3DPEHPK3PXP');
    expect(sealed).not.toContain('JBSWY3DPEHPK3PXP');
    expect(sealed.startsWith('v1.')).toBe(true);
    expect(box.open(sealed)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('uses a fresh IV each time', () => {
    expect(box.seal('same')).not.toBe(box.seal('same'));
  });

  it('refuses tampered ciphertext', () => {
    const [v, iv, tag, body] = box.seal('secret').split('.');
    const flipped = Buffer.from(body, 'base64url');
    flipped[0] ^= 1;
    expect(() =>
      box.open([v, iv, tag, flipped.toString('base64url')].join('.')),
    ).toThrow();
  });

  it('cannot open with another key', () => {
    const other = new SecretBox(randomBytes(32));
    expect(() => other.open(box.seal('secret'))).toThrow();
  });

  it('refuses malformed input', () => {
    expect(() => box.open('plain-text')).toThrow('Unreadable sealed value');
  });

  it('digests deterministically per purpose and key', () => {
    expect(box.digest('backup', 'abc')).toBe(box.digest('backup', 'abc'));
    expect(box.digest('backup', 'abc')).not.toBe(box.digest('other', 'abc'));
    expect(box.digest('backup', 'abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(new SecretBox(randomBytes(32)).digest('backup', 'abc')).not.toBe(
      box.digest('backup', 'abc'),
    );
  });

  it('rejects keys that are not 32 bytes', () => {
    expect(() => new SecretBox(randomBytes(16))).toThrow();
  });
});

describe('parseEncryptionKey', () => {
  it('accepts 32 base64-encoded bytes', () => {
    const raw = randomBytes(32).toString('base64');
    expect(parseEncryptionKey(raw)).toHaveLength(32);
  });

  it('rejects other lengths and non-base64 text', () => {
    expect(() =>
      parseEncryptionKey(randomBytes(16).toString('base64')),
    ).toThrow('ENCRYPTION_KEY');
    expect(() => parseEncryptionKey('x'.repeat(44))).toThrow('ENCRYPTION_KEY');
  });
});
