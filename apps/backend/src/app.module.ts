import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { InventoryModule } from './inventory/inventory.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportingModule } from './reporting/reporting.module';
import { SalesModule } from './sales/sales.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TeamModule } from './team/team.module';
import { ReportsModule } from './reports/reports.module';
import { InsightsModule } from './insights/insights.module';
import { getDatabaseConfig } from './database/database.config';
import { configModuleOptions } from './config/config.options';
import { MailModule } from './mail/mail.module';
import { RedisModule } from './common/redis/redis.module';
import { JobsModule } from './jobs/jobs.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    RedisModule,
    JobsModule,
    RateLimitModule,
    MailModule,
    AuditModule,
    AuthModule,
    ProfileModule,
    InventoryModule,
    ExpensesModule,
    SalesModule,
    // Before Analytics and Reports: its static paths must win over /reports/:id.
    ReportingModule,
    AnalyticsModule,
    NotificationsModule,
    TeamModule,
    ReportsModule,
    InsightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
