import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

export interface CreateNotificationData {
  businessId: string;
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsListQuery {
  businessId: string;
  userId: string;
  page: number;
  limit: number;
  type?: Notification['type'];
  read?: boolean;
}

export interface NotificationsListResult extends PaginatedResult<Notification> {
  unreadCount: number;
}

@Injectable()
export class NotificationsRepository extends Repository<Notification> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  async createNotification(
    data: CreateNotificationData,
  ): Promise<Notification> {
    const notification = this.manager.create(Notification, data);
    return this.manager.save(notification);
  }

  async findByIdAndUser(
    id: string,
    businessId: string,
    userId: string,
  ): Promise<Notification | null> {
    return this.manager.findOne(Notification, {
      where: { id, businessId, userId },
    });
  }

  async markAsRead(notification: Notification): Promise<Notification> {
    notification.read = true;
    return this.manager.save(notification);
  }

  async removeNotification(notification: Notification): Promise<void> {
    await this.manager.remove(notification);
  }

  async markAllRead(businessId: string, userId: string): Promise<number> {
    const result = await this.manager.update(
      Notification,
      { businessId, userId, read: false },
      { read: true },
    );
    return result.affected ?? 0;
  }

  async list(query: NotificationsListQuery): Promise<NotificationsListResult> {
    const { businessId, userId, page, limit, type, read } = query;

    const qb = this.createQueryBuilder('notification')
      .where('notification.businessId = :businessId', { businessId })
      .andWhere('notification.userId = :userId', { userId });

    if (type) {
      qb.andWhere('notification.type = :type', { type });
    }
    if (read !== undefined) {
      qb.andWhere('notification.read = :read', { read });
    }

    qb.orderBy('notification.createdAt', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const unreadCount = await this.manager.count(Notification, {
      where: { businessId, userId, read: false },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }
}
