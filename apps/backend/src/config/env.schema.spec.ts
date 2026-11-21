import { validateEnv } from './env.schema';

const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);
const ENC_KEY = Buffer.alloc(32, 7).toString('base64');

const valid = (overrides: Record<string, unknown> = {}) => ({
  NODE_ENV: 'production',
  JWT_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  ENCRYPTION_KEY: ENC_KEY,
  DATABASE_URL: 'postgresql://luxa:pw@db.internal:5432/luxa',
  FRONTEND_URL: 'https://app.luxa.app',
  ...overrides,
});

describe('validateEnv', () => {
  it('accepts a minimal production config and applies defaults', () => {
    const env = validateEnv(valid());

    expect(env.PORT).toBe(4000);
    expect(env.JWT_EXPIRES_IN).toBe('15m');
    expect(env.JWT_REFRESH_EXPIRATION).toBe('7d');
    expect(env.DATABASE_SSL).toBe('require');
    expect(env.CORS_ORIGINS).toEqual(['https://app.luxa.app']);
  });

  it('takes Redis and Resend settings, refusing a key without a sender', () => {
    expect(
      validateEnv(
        valid({
          REDIS_URL: 'rediss://default:pw@redis.internal:6379',
          RESEND_API_KEY: 're_123',
          EMAIL_FROM: 'LUXA <hello@luxa.app>',
        }),
      ),
    ).toMatchObject({ REDIS_URL: 'rediss://default:pw@redis.internal:6379' });
    expect(() => validateEnv(valid({ REDIS_URL: 'localhost:6379' }))).toThrow(
      /REDIS_URL/,
    );
    expect(() => validateEnv(valid({ RESEND_API_KEY: 're_123' }))).toThrow(
      /EMAIL_FROM is required/,
    );
    expect(validateEnv(valid({ REDIS_URL: '' })).REDIS_URL).toBeUndefined();
  });

  it('defaults NODE_ENV to production when unset', () => {
    const env = validateEnv(valid({ NODE_ENV: undefined }));
    expect(env.NODE_ENV).toBe('production');
  });

  it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET'])(
    'rejects a missing %s',
    (key) => {
      expect(() => validateEnv(valid({ [key]: undefined }))).toThrow(key);
    },
  );

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => validateEnv(valid({ JWT_SECRET: 'short' }))).toThrow(
      /JWT_SECRET.*32/,
    );
  });

  it('rejects a missing or malformed ENCRYPTION_KEY', () => {
    expect(() => validateEnv(valid({ ENCRYPTION_KEY: undefined }))).toThrow(
      /ENCRYPTION_KEY is required/,
    );
    expect(() =>
      validateEnv(
        valid({ ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') }),
      ),
    ).toThrow(/ENCRYPTION_KEY must be 32 bytes/);
    expect(() =>
      validateEnv(valid({ ENCRYPTION_KEY: 'k'.repeat(44) })),
    ).toThrow(/ENCRYPTION_KEY must be 32 bytes/);
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() => validateEnv(valid({ JWT_REFRESH_SECRET: SECRET_A }))).toThrow(
      /JWT_REFRESH_SECRET.*different/,
    );
  });

  it('rejects the documented placeholder secrets', () => {
    expect(() =>
      validateEnv(
        valid({
          JWT_SECRET: 'your_super_secret_jwt_key_change_this_in_production',
        }),
      ),
    ).toThrow(/JWT_SECRET.*placeholder/);
  });

  it('requires a database URL or host, username and name', () => {
    expect(() => validateEnv(valid({ DATABASE_URL: undefined }))).toThrow(
      /DATABASE_URL/,
    );

    const env = validateEnv(
      valid({
        DATABASE_URL: undefined,
        DATABASE_HOST: 'localhost',
        DATABASE_USERNAME: 'postgres',
        DATABASE_NAME: 'luxa',
      }),
    );
    expect(env.DATABASE_PORT).toBe(5432);
  });

  it('requires FRONTEND_URL to be a URL', () => {
    expect(() => validateEnv(valid({ FRONTEND_URL: 'not a url' }))).toThrow(
      /FRONTEND_URL/,
    );
  });

  it('parses a comma-separated CORS allowlist', () => {
    const env = validateEnv(
      valid({ CORS_ORIGINS: 'https://app.luxa.app, https://luxa.app' }),
    );
    expect(env.CORS_ORIGINS).toEqual([
      'https://app.luxa.app',
      'https://luxa.app',
    ]);
  });

  it('rejects a CORS entry that is not an origin', () => {
    expect(() => validateEnv(valid({ CORS_ORIGINS: '*' }))).toThrow(
      /CORS_ORIGINS/,
    );
  });

  it('forbids unverified database TLS in production', () => {
    expect(() => validateEnv(valid({ DATABASE_SSL: 'no-verify' }))).toThrow(
      /DATABASE_SSL/,
    );
  });

  it('allows unverified database TLS outside production', () => {
    const env = validateEnv(
      valid({ NODE_ENV: 'development', DATABASE_SSL: 'no-verify' }),
    );
    expect(env.DATABASE_SSL).toBe('no-verify');
  });

  it('defaults database TLS to disabled in test', () => {
    expect(validateEnv(valid({ NODE_ENV: 'test' })).DATABASE_SSL).toBe(
      'disable',
    );
  });

  it('accepts a bare cookie domain and rejects a URL', () => {
    expect(
      validateEnv(valid({ COOKIE_DOMAIN: 'luxa.app' })).COOKIE_DOMAIN,
    ).toBe('luxa.app');
    expect(
      validateEnv(valid({ COOKIE_DOMAIN: '' })).COOKIE_DOMAIN,
    ).toBeUndefined();
    expect(() =>
      validateEnv(valid({ COOKIE_DOMAIN: 'https://luxa.app' })),
    ).toThrow(/COOKIE_DOMAIN/);
  });

  it('keeps unrelated variables such as AI settings', () => {
    const env = validateEnv(valid({ AI_MODEL: 'gpt-4o-mini' }));
    expect((env as Record<string, unknown>).AI_MODEL).toBe('gpt-4o-mini');
  });

  it('lists every problem in one error', () => {
    expect(() =>
      validateEnv({ NODE_ENV: 'production', FRONTEND_URL: 'x' }),
    ).toThrow(/JWT_SECRET[\s\S]*JWT_REFRESH_SECRET[\s\S]*FRONTEND_URL/);
  });
});
