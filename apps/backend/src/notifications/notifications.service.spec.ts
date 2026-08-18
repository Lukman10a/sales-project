import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { Notification } from '../entities/notification.entity';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: {
    createNotification: jest.Mock;
    list: jest.Mock;
    findByIdAndUser: jest.Mock;
    markAsRead: jest.Mock;
    removeNotification: jest.Mock;
    markAllRead: jest.Mock;
  };

  const user = { id: 'u1', businessId: 'b1' };

  beforeEach(() => {
    repository = {
      createNotification: jest.fn(),
      list: jest.fn(),
      findByIdAndUser: jest.fn(),
      markAsRead: jest.fn(),
      removeNotification: jest.fn(),
      markAllRead: jest.fn(),
    };

    service = new NotificationsService(
      repository as unknown as NotificationsRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to the repository with the full data', async () => {
      const notification = { id: 'n1' } as unknown as Notification;
      repository.createNotification.mockResolvedValue(notification);

      const data = {
        businessId: 'b1',
        userId: 'u1',
        type: 'inventory' as const,
        title: 'Low Stock Alert',
        message: 'Widget is running low on stock.',
        metadata: { productId: 'p1' },
      };

      await expect(service.create(data)).resolves.toBe(notification);
      expect(repository.createNotification).toHaveBeenCalledWith(data);
    });
  });

  describe('list', () => {
    it('delegates to the repository with businessId, userId and query', async () => {
      const result = { data: [], pagination: {}, unreadCount: 0 };
      repository.list.mockResolvedValue(result);

      const query: QueryNotificationsDto = {
        page: 1,
        limit: 20,
        type: 'inventory',
        read: true,
      };

      await expect(service.list(user, query)).resolves.toBe(result);
      expect(repository.list).toHaveBeenCalledWith({
        businessId: 'b1',
        userId: 'u1',
        page: 1,
        limit: 20,
        type: 'inventory',
        read: true,
      });
    });
  });

  describe('markAsRead', () => {
    it('throws NotFoundException when the notification is missing', async () => {
      repository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.markAsRead(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('marks the notification as read for the current user', async () => {
      const notification = {
        id: 'n1',
        read: false,
      } as unknown as Notification;
      const saved = { ...notification, read: true };
      repository.findByIdAndUser.mockResolvedValue(notification);
      repository.markAsRead.mockResolvedValue(saved);

      await expect(service.markAsRead(user, 'n1')).resolves.toBe(saved);
      expect(repository.findByIdAndUser).toHaveBeenCalledWith('n1', 'b1', 'u1');
      expect(repository.markAsRead).toHaveBeenCalledWith(notification);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the notification is missing', async () => {
      repository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.remove(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes the notification and returns a confirmation message', async () => {
      const notification = { id: 'n1' } as unknown as Notification;
      repository.findByIdAndUser.mockResolvedValue(notification);
      repository.removeNotification.mockResolvedValue(undefined);

      await expect(service.remove(user, 'n1')).resolves.toEqual({
        message: 'Notification deleted successfully',
      });
      expect(repository.removeNotification).toHaveBeenCalledWith(notification);
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications read for the user and returns the updated count', async () => {
      repository.markAllRead.mockResolvedValue(3);

      await expect(service.markAllRead(user)).resolves.toEqual({
        updated: 3,
      });
      expect(repository.markAllRead).toHaveBeenCalledWith('b1', 'u1');
    });
  });
});
