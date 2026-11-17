import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TeamModule } from './team/team.module';
import { ReportsModule } from './reports/reports.module';
import { InsightsModule } from './insights/insights.module';
import { getDatabaseConfig } from './database/database.config';
import { configModuleOptions } from './config/config.options';

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
    ScheduleModule.forRoot(),
    AuthModule,
    ProfileModule,
    InventoryModule,
    SalesModule,
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
