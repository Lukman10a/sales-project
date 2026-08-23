import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { AiInsight } from '../entities/ai-insight.entity';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightRepository } from './insight.repository';
import { InsightLlmModule } from './ai/insight-llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, InventoryItem, AiInsight]),
    InsightLlmModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService, InsightRepository],
})
export class InsightsModule {}
