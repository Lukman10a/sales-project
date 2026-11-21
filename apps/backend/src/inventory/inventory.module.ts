import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { StockLedgerRepository } from './stock-ledger.repository';
import { StockIntegrityListener } from './stock-integrity.listener';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
    StockLedgerRepository,
    StockIntegrityListener,
  ],
  exports: [InventoryService, InventoryRepository, StockLedgerRepository],
})
export class InventoryModule {}
