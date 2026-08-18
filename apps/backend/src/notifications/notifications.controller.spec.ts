import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: {
    list: jest.Mock;
    markAsRead: jest.Mock;
    remove: jest.Mock;
    markAllRead: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'b1',
  };

  beforeEach(async () => {
    notificationsService = {
      list: jest.fn(),
      markAsRead: jest.fn(),
      remove: jest.fn(),
      markAllRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(NotificationsController);
  });

  it('delegates list to the service', async () => {
    const query = { page: 1, limit: 20 };
    notificationsService.list.mockResolvedValue({
      data: [],
      pagination: {},
      unreadCount: 0,
    });

    await expect(controller.list(currentUser, query)).resolves.toEqual({
      data: [],
      pagination: {},
      unreadCount: 0,
    });
    expect(notificationsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates markAsRead to the service', async () => {
    notificationsService.markAsRead.mockResolvedValue({ id: 'n1', read: true });

    await expect(controller.markAsRead(currentUser, 'n1')).resolves.toEqual({
      id: 'n1',
      read: true,
    });
    expect(notificationsService.markAsRead).toHaveBeenCalledWith(
      currentUser,
      'n1',
    );
  });

  it('delegates remove to the service', async () => {
    notificationsService.remove.mockResolvedValue({
      message: 'Notification deleted successfully',
    });

    await expect(controller.remove(currentUser, 'n1')).resolves.toEqual({
      message: 'Notification deleted successfully',
    });
    expect(notificationsService.remove).toHaveBeenCalledWith(currentUser, 'n1');
  });

  it('delegates markAllRead to the service', async () => {
    notificationsService.markAllRead.mockResolvedValue({ updated: 3 });

    await expect(controller.markAllRead(currentUser)).resolves.toEqual({
      updated: 3,
    });
    expect(notificationsService.markAllRead).toHaveBeenCalledWith(currentUser);
  });
});
