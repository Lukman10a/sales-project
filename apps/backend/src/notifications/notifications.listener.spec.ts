import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { Sale } from '../entities/sale.entity';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let notificationsService: { create: jest.Mock };
  let notificationsRepository: { findAiInsightRecipients: jest.Mock };

  beforeEach(() => {
    notificationsService = { create: jest.fn() };
    notificationsRepository = {
      findAiInsightRecipients: jest.fn().mockResolvedValue(['u1']),
    };
    listener = new NotificationsListener(
      notificationsService as unknown as NotificationsService,
      notificationsRepository as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLowStockEvent', () => {
    it('creates an inventory notification for the item creator', async () => {
      const item = {
        id: 'p1',
        name: 'Widget',
        quantity: 2,
        createdBy: 'u1',
      } as unknown as InventoryItem;

      await listener.handleLowStockEvent({ businessId: 'b1', item });

      expect(notificationsService.create).toHaveBeenCalledWith({
        businessId: 'b1',
        userId: 'u1',
        type: 'inventory',
        title: 'Low Stock Alert',
        message: 'Widget is running low on stock (2 remaining).',
        metadata: { productId: 'p1', quantity: 2 },
      });
    });
  });

  describe('handleSaleCompletedEvent', () => {
    it('creates a sale notification for the seller', async () => {
      const sale = {
        id: '12345678-90ab-cdef-1234-567890abcdef',
        soldBy: 'u1',
        total: 250.5,
      } as unknown as Sale;

      await listener.handleSaleCompletedEvent({ businessId: 'b1', sale });

      expect(notificationsService.create).toHaveBeenCalledWith({
        businessId: 'b1',
        userId: 'u1',
        type: 'sale',
        title: 'New Sale Recorded',
        message: 'Sale #12345678 recorded for total 250.5.',
        metadata: { saleId: sale.id, total: 250.5 },
      });
    });
  });

  describe('handleInsightsGenerated', () => {
    it('creates ai notification for opted-in owner/managers with top insight', async () => {
      notificationsRepository.findAiInsightRecipients.mockResolvedValue([
        'u1',
        'u2',
      ]);
      await listener.handleInsightsGenerated({
        businessId: 'b1',
        insights: [
          {
            id: 'restock:p1',
            type: 'restock',
            priority: 'high',
            title: 'Restock Widget',
            description: 'Widget low',
            impact: '',
            action: '',
            metrics: [],
          } as never,
        ],
      });

      expect(
        notificationsRepository.findAiInsightRecipients,
      ).toHaveBeenCalledWith('b1');
      expect(notificationsService.create).toHaveBeenCalledWith({
        businessId: 'b1',
        userId: 'u1',
        type: 'ai',
        title: 'Restock Widget',
        message: 'Widget low',
        metadata: { insightId: 'restock:p1', actionType: 'manage' },
      });
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('does not create notification when no high/medium insights', async () => {
      await listener.handleInsightsGenerated({
        businessId: 'b1',
        insights: [
          {
            id: 'warning:p1',
            type: 'warning',
            priority: 'low',
            title: 'Slow',
            description: 'Slow',
            impact: '',
            action: '',
            metrics: [],
          } as never,
        ],
      });

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('does not notify when no opted-in recipients', async () => {
      notificationsRepository.findAiInsightRecipients.mockResolvedValue([]);
      await listener.handleInsightsGenerated({
        businessId: 'b1',
        insights: [
          {
            id: 'restock:p1',
            type: 'restock',
            priority: 'high',
            title: 'T',
            description: 'D',
            impact: '',
            action: '',
            metrics: [],
          } as never,
        ],
      });

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('respects aiInsights preference via repository', async () => {
      notificationsRepository.findAiInsightRecipients.mockResolvedValue(['u1']);
      await listener.handleInsightsGenerated({
        businessId: 'b1',
        insights: [
          {
            id: 'restock:p1',
            type: 'restock',
            priority: 'high',
            title: 'T',
            description: 'D',
            impact: '',
            action: '',
            metrics: [],
          } as never,
        ],
      });

      expect(notificationsService.create).toHaveBeenCalledTimes(1);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1' }),
      );
    });
  });
});
