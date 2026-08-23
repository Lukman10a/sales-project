import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightRepository } from './insight.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, InventoryItem])],
  controllers: [InsightsController],
  providers: [InsightsService, InsightRepository],
})
export class InsightsModule {}
