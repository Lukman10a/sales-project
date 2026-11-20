import { z } from 'zod';

/**
 * Environment contract for the API. Validated once at boot through
 * `ConfigModule.forRoot({ validate: validateEnv })`; the app refuses to start
 * when anything required is missing or unsafe.
 */

const PLACEHOLDER_SECRETS = [
  'your_super_secret_jwt_key_change_this_in_production',
  'your_super_secret_refresh_key_change_this_in_production',
  'default-secret',
  'default-refresh-secret',
];

const secret = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .min(32, `${name} must be at least 32 characters`)
    .refine((v) => !PLACEHOLDER_SECRETS.includes(v), {
      message: `${name} is still a placeholder value; generate one with \`openssl rand -base64 48\``,
    });

/** 32 random bytes, base64 (`openssl rand -base64 32`). Seals secrets at rest. */
const encryptionKey = z.string({ error: 'ENCRYPTION_KEY is required' }).refine(
  (v) => {
    const bytes = Buffer.from(v, 'base64');
    return bytes.length === 32 && bytes.toString('base64') === v.trim();
  },
  {
    message:
      'ENCRYPTION_KEY must be 32 bytes, base64-encoded; generate one with `openssl rand -base64 32`',
  },
);

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const originList = z
  .string()
  .transform((raw) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(
    z.array(
      z.string().refine(
        (s) => {
          try {
            const u = new URL(s);
            return u.origin === s.replace(/\/$/, '');
          } catch {
            return false;
          }
        },
        {
          message: 'each entry must be an origin such as https://app.luxa.app',
        },
      ),
    ),
  );

const schema = z
  .looseObject({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('production'),
    PORT: z.coerce.number().int().positive().default(4000),

    JWT_SECRET: secret('JWT_SECRET'),
    JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),
    ENCRYPTION_KEY: encryptionKey,

    DATABASE_URL: optionalString,
    DATABASE_HOST: optionalString,
    DATABASE_PORT: z.coerce.number().int().positive().default(5432),
    DATABASE_USERNAME: optionalString,
    DATABASE_PASSWORD: optionalString,
    DATABASE_NAME: optionalString,
    DATABASE_SSL: z.enum(['require', 'no-verify', 'disable']).optional(),
    DATABASE_CA: optionalString,
    DB_MANUAL_INIT: z.enum(['true', 'false']).optional(),
    LOG_LEVEL: optionalString,

    FRONTEND_URL: z.url({ error: 'FRONTEND_URL must be a URL' }),
    CORS_ORIGINS: originList.optional(),
    /** Parent domain for cookies the web app reads (e.g. luxa.app). */
    COOKIE_DOMAIN: optionalString.pipe(
      z
        .string()
        .regex(
          /^[a-z0-9.-]+$/i,
          'COOKIE_DOMAIN must be a bare domain such as luxa.app',
        )
        .optional(),
    ),
  })
  .superRefine((env, ctx) => {
    if (
      env.JWT_SECRET &&
      env.JWT_REFRESH_SECRET &&
      env.JWT_SECRET === env.JWT_REFRESH_SECRET
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be different from JWT_SECRET',
      });
    }

    const hasParts =
      env.DATABASE_HOST && env.DATABASE_USERNAME && env.DATABASE_NAME;
    if (!env.DATABASE_URL && !hasParts) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'set DATABASE_URL, or DATABASE_HOST + DATABASE_USERNAME + DATABASE_NAME',
      });
    }

    if (env.NODE_ENV === 'production' && env.DATABASE_SSL === 'no-verify') {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_SSL'],
        message:
          'DATABASE_SSL=no-verify is not allowed in production; use require (with DATABASE_CA if needed)',
      });
    }
  })
  .transform((env) => ({
    ...env,
    DATABASE_SSL:
      env.DATABASE_SSL ??
      (env.NODE_ENV === 'production'
        ? ('require' as const)
        : env.NODE_ENV === 'test'
          ? ('disable' as const)
          : ('no-verify' as const)),
    CORS_ORIGINS: env.CORS_ORIGINS ?? [new URL(env.FRONTEND_URL).origin],
  }));

export type Env = z.output<typeof schema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = schema.safeParse(config);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}
