import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const url = configService.get<string>('DATABASE_URL');
  const connection = url
    ? { url }
    : {
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
      };

  return {
    type: 'postgres',
    ...connection,
    entities: [
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
    ],
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: configService.get<string>('LOG_LEVEL') === 'debug',
    manualInitialization:
      configService.get<string>('DB_MANUAL_INIT') === 'true',
    ssl: sslOptions(
      configService.getOrThrow<Env['DATABASE_SSL']>('DATABASE_SSL'),
      configService.get<string>('DATABASE_CA'),
    ),
  };
};
