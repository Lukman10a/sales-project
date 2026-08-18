import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification } from '../entities/notification.entity';
import {
  NotificationsRepository,
  CreateNotificationData,
  NotificationsListResult,
} from './notifications.repository';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private notificationsRepository: NotificationsRepository) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    return this.notificationsRepository.createNotification(data);
  }

  async list(
    user: { id: string; businessId: string },
    query: QueryNotificationsDto,
  ): Promise<NotificationsListResult> {
    return this.notificationsRepository.list({
      businessId: user.businessId,
      userId: user.id,
      page: query.page,
      limit: query.limit,
      type: query.type,
      read: query.read,
    });
  }

  async markAsRead(
    user: { id: string; businessId: string },
    id: string,
  ): Promise<Notification> {
    const notification = await this.findByIdForUser(user, id);
    return this.notificationsRepository.markAsRead(notification);
  }

  async remove(
    user: { id: string; businessId: string },
    id: string,
  ): Promise<{ message: string }> {
    const notification = await this.findByIdForUser(user, id);
    await this.notificationsRepository.removeNotification(notification);
    return { message: 'Notification deleted successfully' };
  }

  async markAllRead(user: {
    id: string;
    businessId: string;
  }): Promise<{ updated: number }> {
    const updated = await this.notificationsRepository.markAllRead(
      user.businessId,
      user.id,
    );
    return { updated };
  }

  private async findByIdForUser(
    user: { id: string; businessId: string },
    id: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findByIdAndUser(
      id,
      user.businessId,
      user.id,
    );
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }
}
