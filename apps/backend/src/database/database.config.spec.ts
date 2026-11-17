import { ConfigService } from '@nestjs/config';
import { getDatabaseConfig, sslOptions } from './database.config';

const config = (values: Record<string, unknown>) =>
  ({
    get: jest.fn((k: string) => values[k]),
    getOrThrow: jest.fn((k: string) => {
      if (values[k] === undefined) throw new Error(`missing ${k}`);
      return values[k];
    }),
  }) as unknown as ConfigService;

describe('sslOptions', () => {
  it('verifies certificates when required', () => {
    expect(sslOptions('require')).toEqual({ rejectUnauthorized: true });
  });

  it('passes a custom CA through', () => {
    expect(sslOptions('require', 'PEM')).toEqual({
      rejectUnauthorized: true,
      ca: 'PEM',
    });
  });

  it('skips verification only for no-verify', () => {
    expect(sslOptions('no-verify')).toEqual({ rejectUnauthorized: false });
  });

  it('turns TLS off when disabled', () => {
    expect(sslOptions('disable')).toBe(false);
  });
});

describe('getDatabaseConfig', () => {
  it('prefers DATABASE_URL over the individual fields', () => {
    const options = getDatabaseConfig(
      config({
        DATABASE_URL: 'postgresql://u:p@h:5432/d',
        DATABASE_HOST: 'ignored',
        DATABASE_SSL: 'require',
      }),
    ) as { url?: string; host?: string };

    expect(options.url).toBe('postgresql://u:p@h:5432/d');
    expect(options.host).toBeUndefined();
  });

  it('never synchronizes outside development', () => {
    const options = getDatabaseConfig(
      config({ NODE_ENV: 'production', DATABASE_SSL: 'require' }),
    );
    expect(options.synchronize).toBe(false);
  });

  it('builds TLS options from DATABASE_SSL', () => {
    const options = getDatabaseConfig(
      config({ NODE_ENV: 'production', DATABASE_SSL: 'require' }),
    ) as { ssl?: unknown };
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
  });
});
