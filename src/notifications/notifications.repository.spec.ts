import { NotificationsRepository } from './notifications.repository';
import type { EntityManager } from 'typeorm';
import { Notification } from '../entities/notification.entity';

describe('NotificationsRepository', () => {
  let repository: NotificationsRepository;
  let manager: EntityManager;

  const managerMock = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(() => {
    manager = managerMock as unknown as EntityManager;
    repository = new NotificationsRepository({
      createEntityManager: jest.fn().mockReturnValue(manager),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('creates and saves a notification through the manager', async () => {
      const notification = { id: 'n1' } as Notification;
      managerMock.create.mockReturnValue(notification);
      managerMock.save.mockResolvedValue(notification);

      const data = {
        businessId: 'b1',
        userId: 'u1',
        type: 'inventory' as const,
        title: 'Low Stock Alert',
        message: 'Widget is running low on stock.',
        metadata: { productId: 'p1' },
      };

      const result = await repository.createNotification(data);

      expect(managerMock.create).toHaveBeenCalledWith(Notification, data);
      expect(managerMock.save).toHaveBeenCalledWith(notification);
      expect(result).toBe(notification);
    });
  });

  describe('findByIdAndUser', () => {
    it('finds a notification by id, businessId and userId', async () => {
      const notification = {
        id: 'n1',
        businessId: 'b1',
        userId: 'u1',
      } as Notification;
      managerMock.findOne.mockResolvedValue(notification);

      await expect(repository.findByIdAndUser('n1', 'b1', 'u1')).resolves.toBe(
        notification,
      );
      expect(managerMock.findOne).toHaveBeenCalledWith(Notification, {
        where: { id: 'n1', businessId: 'b1', userId: 'u1' },
      });
    });

    it('returns null when no notification matches', async () => {
      managerMock.findOne.mockResolvedValue(null);

      await expect(
        repository.findByIdAndUser('missing', 'b1', 'u1'),
      ).resolves.toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('marks the notification as read and saves it', async () => {
      const notification = {
        id: 'n1',
        read: false,
      } as Notification;
      const saved = { ...notification, read: true };
      managerMock.save.mockResolvedValue(saved);

      const result = await repository.markAsRead(notification);

      expect(notification.read).toBe(true);
      expect(managerMock.save).toHaveBeenCalledWith(notification);
      expect(result).toBe(saved);
    });
  });

  describe('removeNotification', () => {
    it('removes the notification through the manager', async () => {
      const notification = { id: 'n1' } as Notification;
      managerMock.remove.mockResolvedValue(notification);

      await repository.removeNotification(notification);

      expect(managerMock.remove).toHaveBeenCalledWith(notification);
    });
  });

  describe('markAllRead', () => {
    it('updates all unread notifications for the user and returns the affected count', async () => {
      managerMock.update.mockResolvedValue({ affected: 3 });

      const result = await repository.markAllRead('b1', 'u1');

      expect(managerMock.update).toHaveBeenCalledWith(
        Notification,
        { businessId: 'b1', userId: 'u1', read: false },
        { read: true },
      );
      expect(result).toBe(3);
    });

    it('returns 0 when the update reports no affected rows', async () => {
      managerMock.update.mockResolvedValue({ affected: null });

      await expect(repository.markAllRead('b1', 'u1')).resolves.toBe(0);
    });
  });

  describe('list', () => {
    it('filters by businessId and userId with pagination and returns unreadCount', async () => {
      const notifications = [{ id: 'n1' } as Notification];
      const getManyAndCount = jest.fn().mockResolvedValue([notifications, 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
      managerMock.count.mockResolvedValue(3);

      const result = await repository.list({
        businessId: 'b1',
        userId: 'u1',
        page: 1,
        limit: 20,
      });

      expect(qb.where).toHaveBeenCalledWith(
        'notification.businessId = :businessId',
        { businessId: 'b1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'notification.userId = :userId',
        {
          userId: 'u1',
        },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('notification.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(managerMock.count).toHaveBeenCalledWith(Notification, {
        where: { businessId: 'b1', userId: 'u1', read: false },
      });
      expect(result.data).toEqual(notifications);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
      expect(result.unreadCount).toBe(3);
    });

    it('applies type and read filters when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
      managerMock.count.mockResolvedValue(0);

      await repository.list({
        businessId: 'b1',
        userId: 'u1',
        page: 1,
        limit: 20,
        type: 'inventory',
        read: true,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('notification.type = :type', {
        type: 'inventory',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('notification.read = :read', {
        read: true,
      });
    });
  });
});
