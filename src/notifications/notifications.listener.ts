import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { Sale } from '../entities/sale.entity';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('inventory.low-stock')
  async handleLowStockEvent(payload: {
    businessId: string;
    item: InventoryItem;
  }): Promise<void> {
    await this.notificationsService.create({
      businessId: payload.businessId,
      userId: payload.item.createdBy,
      type: 'inventory',
      title: 'Low Stock Alert',
      message: `${payload.item.name} is running low on stock (${payload.item.quantity} remaining).`,
      metadata: { productId: payload.item.id, quantity: payload.item.quantity },
    });
  }

  @OnEvent('sale.completed')
  async handleSaleCompletedEvent(payload: {
    businessId: string;
    sale: Sale;
  }): Promise<void> {
    await this.notificationsService.create({
      businessId: payload.businessId,
      userId: payload.sale.soldBy,
      type: 'sale',
      title: 'New Sale Recorded',
      message: `Sale #${payload.sale.id.slice(0, 8)} recorded for total ${payload.sale.total}.`,
      metadata: { saleId: payload.sale.id, total: payload.sale.total },
    });
  }
}
