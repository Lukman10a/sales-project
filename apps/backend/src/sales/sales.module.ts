import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { HeldTransaction } from '../entities/held-transaction.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, HeldTransaction, InventoryItem]),
  ],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService, SalesRepository],
})
export class SalesModule {}
