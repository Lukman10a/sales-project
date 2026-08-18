import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import {
  AnalyticsController,
  DashboardController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, InventoryItem])],
  controllers: [AnalyticsController, DashboardController],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
