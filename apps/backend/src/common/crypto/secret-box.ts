import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

/**
 * Application-level encryption for secrets at rest (e.g. TOTP seeds), keyed
 * by ENCRYPTION_KEY. AES-256-GCM, so tampered ciphertext fails to open.
 * The same master key also yields a separate HMAC key for lookup digests of
 * short secrets (backup codes): a leaked database alone cannot brute-force
 * them.
 */

export const SECRET_BOX = Symbol('SECRET_BOX');
const VERSION = 'v1';

/** ENCRYPTION_KEY is 32 random bytes, base64-encoded (`openssl rand -base64 32`). */
export function parseEncryptionKey(raw: string): Buffer {
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32 || key.toString('base64') !== raw.trim()) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  }
  return key;
}

const subkey = (master: Buffer, info: string) =>
  Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), info, 32));

export class SecretBox {
  private readonly encKey: Buffer;
  private readonly macKey: Buffer;

  constructor(masterKey: Buffer) {
    if (masterKey.length !== 32) throw new Error('Key must be 32 bytes');
    this.encKey = subkey(masterKey, 'luxa:secret-box:enc');
    this.macKey = subkey(masterKey, 'luxa:secret-box:mac');
  }

  /** Encrypts to `v1.<iv>.<tag>.<ciphertext>` (base64url parts). */
  seal(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const body = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv, tag, body]
      .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
      .join('.');
  }

  open(sealed: string): string {
    const [version, iv, tag, body] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || body === undefined) {
      throw new Error('Unreadable sealed value');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encKey,
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(body, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Keyed digest (hex) for looking up a secret without storing it. */
  digest(purpose: string, value: string): string {
    return createHmac('sha256', this.macKey)
      .update(`${purpose}\0${value}`)
      .digest('hex');
  }
}
