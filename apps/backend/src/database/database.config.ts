import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.schema';
import { User } from '../entities/user.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { Notification } from '../entities/notification.entity';
import { TeamMember } from '../entities/team-member.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Report } from '../entities/report.entity';
import { AiInsight } from '../entities/ai-insight.entity';
import { Session } from '../entities/session.entity';
import { AuthToken } from '../entities/auth-token.entity';

export const ENTITIES = [
  User,
  UserProfile,
  InventoryItem,
  Sale,
  SaleItem,
  HeldTransaction,
  Notification,
  TeamMember,
  Report,
  AiInsight,
  Session,
  AuthToken,
];

/** Compiled (.js) or ts-node (.ts) migrations, wherever this file runs from. */
export const MIGRATIONS = [join(__dirname, 'migrations', '*.{ts,js}')];

type SslOption = false | { rejectUnauthorized: boolean; ca?: string };

/**
 * Maps DATABASE_SSL to the pg driver's TLS options.
 * - require   → TLS with certificate verification (optionally a custom CA)
 * - no-verify → TLS without verification (refused in production by the env schema)
 * - disable   → plain TCP (local Postgres, CI)
 */
export function sslOptions(mode: Env['DATABASE_SSL'], ca?: string): SslOption {
  if (mode === 'disable') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

type DbEnv = Pick<
  Env,
  | 'DATABASE_URL'
  | 'DATABASE_HOST'
  | 'DATABASE_PORT'
  | 'DATABASE_USERNAME'
  | 'DATABASE_PASSWORD'
  | 'DATABASE_NAME'
  | 'DATABASE_SSL'
  | 'DATABASE_CA'
  | 'LOG_LEVEL'
>;

/**
 * Shared by the Nest app and the TypeORM CLI (data-source.ts). The schema is
 * only ever changed by migrations: `synchronize` is off everywhere.
 */
export function buildDataSourceOptions(env: DbEnv): DataSourceOptions {
  const connection = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DATABASE_HOST,
        port: env.DATABASE_PORT,
        username: env.DATABASE_USERNAME,
        password: env.DATABASE_PASSWORD,
        database: env.DATABASE_NAME,
      };

  return {
    type: 'postgres',
    ...connection,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: env.LOG_LEVEL === 'debug',
    ssl: sslOptions(env.DATABASE_SSL, env.DATABASE_CA),
  };
}

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const get = <K extends keyof DbEnv>(key: K) =>
    configService.get<DbEnv[K]>(key);
  return {
    ...buildDataSourceOptions({
      DATABASE_URL: get('DATABASE_URL'),
      DATABASE_HOST: get('DATABASE_HOST'),
      DATABASE_PORT: get('DATABASE_PORT') ?? 5432,
      DATABASE_USERNAME: get('DATABASE_USERNAME'),
      DATABASE_PASSWORD: get('DATABASE_PASSWORD'),
      DATABASE_NAME: get('DATABASE_NAME'),
      DATABASE_SSL:
        configService.getOrThrow<DbEnv['DATABASE_SSL']>('DATABASE_SSL'),
      DATABASE_CA: get('DATABASE_CA'),
      LOG_LEVEL: get('LOG_LEVEL'),
    }),
    manualInitialization:
      configService.get<string>('DB_MANUAL_INIT') === 'true',
  };
};
