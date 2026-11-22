import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { Sale } from '../entities/sale.entity';
import type { Insight } from '../insights/insight.types';
import { selectTopAiInsight } from '../insights/insight.types';
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

  /** The business id is the owner's user id. */
  @OnEvent('inventory.ledger-mismatch')
  async handleLedgerMismatch(payload: {
    businessId: string;
    products: Array<{
      productId: string;
      name: string;
      quantity: number;
      ledger: number;
    }>;
  }): Promise<void> {
    await this.notificationsService.create({
      businessId: payload.businessId,
      userId: payload.businessId,
      type: 'alert',
      title: 'Stock check found a mismatch',
      message: `${payload.products.length} product(s) have a stock count that does not match their history: ${payload.products
        .slice(0, 5)
        .map((p) => p.name)
        .join(', ')}.`,
      metadata: { products: payload.products.slice(0, 50) },
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
    const top = selectTopAiInsight(payload.insights);
    if (!top) return;
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
