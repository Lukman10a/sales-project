import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';
import type { InventoryItem } from '../entities/inventory-item.entity';
import type { Sale } from '../entities/sale.entity';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let notificationsService: { create: jest.Mock };

  beforeEach(() => {
    notificationsService = { create: jest.fn() };
    listener = new NotificationsListener(
      notificationsService as unknown as NotificationsService,
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
});
