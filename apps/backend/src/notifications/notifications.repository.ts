import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertTenant } from '../common/tenancy/assert-tenant';

export interface CreateNotificationData {
  businessId: string;
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsListQuery {
  userId: string;
  page: number;
  limit: number;
  type?: Notification['type'];
  read?: boolean;
}

export interface NotificationsListResult extends PaginatedResult<Notification> {
  unreadCount: number;
}

/**
 * Tenant-owned: every method takes `businessId` first, except
 * `findAllBusinessIds`, which the scheduled digest uses to visit each tenant.
 */
@Injectable()
export class NotificationsRepository extends Repository<Notification> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  async createNotification(
    businessId: string,
    data: Omit<CreateNotificationData, 'businessId'>,
  ): Promise<Notification> {
    const notification = this.manager.create(Notification, {
      ...data,
      businessId,
    });
    return this.manager.save(notification);
  }

  async findByIdAndUser(
    businessId: string,
    id: string,
    userId: string,
  ): Promise<Notification | null> {
    return this.manager.findOne(Notification, {
      where: { id, businessId, userId },
    });
  }

  async markAsRead(
    businessId: string,
    notification: Notification,
  ): Promise<Notification> {
    assertTenant(businessId, notification);
    notification.read = true;
    return this.manager.save(notification);
  }

  async removeNotification(
    businessId: string,
    notification: Notification,
  ): Promise<void> {
    assertTenant(businessId, notification);
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

  async list(
    businessId: string,
    query: NotificationsListQuery,
  ): Promise<NotificationsListResult> {
    const { userId, page, limit, type, read } = query;

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

  async findAiInsightRecipients(businessId: string): Promise<string[]> {
    const users = await this.manager.find(User, {
      where: { businessId, role: In(['owner', 'manager']) as never },
      select: ['id'],
    } as never);
    if (users.length === 0) return [];
    const ids = users.map((u) => u.id);
    const profiles = await this.manager.find(UserProfile, {
      where: { userId: In(ids) },
    });
    const prefMap = new Map(
      profiles.map((p) => [p.userId, p.notificationPreferences?.aiInsights]),
    );
    return ids.filter((id) => {
      const pref = prefMap.get(id);
      // default true when no profile or undefined
      return pref === undefined ? true : pref === true;
    });
  }

  async findAllBusinessIds(): Promise<string[]> {
    const rows = await this.manager
      .getRepository(User)
      .createQueryBuilder('u')
      .select('DISTINCT u.businessId', 'businessId')
      .where('u.businessId IS NOT NULL')
      .getRawMany<{ businessId: string }>();
    return rows
      .map((r) => r.businessId)
      .filter((id): id is string => Boolean(id));
  }
}
