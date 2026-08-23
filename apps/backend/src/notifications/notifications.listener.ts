import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { Sale } from '../entities/sale.entity';
import type { Insight } from '../insights/insight.types';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsListener {
  constructor(
    private notificationsService: NotificationsService,
    private notificationsRepository: NotificationsRepository,
  ) {}

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

  @OnEvent('insights.generated')
  async handleInsightsGenerated(payload: {
    businessId: string;
    insights: Insight[];
  }): Promise<void> {
    const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const highMedium = [...payload.insights]
      .filter((i) => i.priority === 'high' || i.priority === 'medium')
      .sort((a, b) => order[b.priority] - order[a.priority]);
    if (highMedium.length === 0) return;
    const top = highMedium[0];
    const recipients =
      await this.notificationsRepository.findAiInsightRecipients(
        payload.businessId,
      );
    for (const userId of recipients) {
      await this.notificationsService.create({
        businessId: payload.businessId,
        userId,
        type: 'ai',
        title: top.title,
        message: top.description,
        metadata: { insightId: top.id, actionType: 'manage' },
      });
    }
  }
}
