import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { Notification } from '../entities/notification.entity';
import { TeamMember } from '../entities/team-member.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Report } from '../entities/report.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT'),
  username: configService.get<string>('DATABASE_USERNAME'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_NAME'),
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
  ],
  synchronize: configService.get<string>('NODE_ENV') === 'development',
  logging: configService.get<string>('LOG_LEVEL') === 'debug',
  manualInitialization: configService.get<string>('DB_MANUAL_INIT') === 'true',
  ssl: {
    rejectUnauthorized: false,
  },
});
