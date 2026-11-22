import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEvent, type AuditAction } from '../entities/audit-event.entity';
import { TransactionalRepository } from '../common/transactions/transactions';

export type NewAuditEvent = Omit<AuditEvent, 'id' | 'businessId' | 'createdAt'>;

export interface AuditListQuery {
  actorUserId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  /** Exclusive: rows strictly older than this (createdAt, id). */
  before?: { createdAt: Date; id: string };
  limit: number;
}

/**
 * Tenant-owned and append-only: rows are inserted and read, never updated or
 * deleted. Inserts join the surrounding transaction, so an event commits or
 * rolls back with the change it records.
 */
@Injectable()
export class AuditRepository extends TransactionalRepository<AuditEvent> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(AuditEvent, dataSource.createEntityManager());
  }

  async append(businessId: string, event: NewAuditEvent): Promise<void> {
    await this.save(this.create({ ...event, businessId }));
  }

  /** Newest first, ordered by (createdAt, id). */
  list(businessId: string, query: AuditListQuery): Promise<AuditEvent[]> {
    const qb = this.createQueryBuilder('e').where(
      'e.businessId = :businessId',
      { businessId },
    );
    if (query.actorUserId) {
      qb.andWhere('e.actorUserId = :actorUserId', {
        actorUserId: query.actorUserId,
      });
    }
    if (query.action) {
      qb.andWhere('e.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('e.entityType = :entityType', {
        entityType: query.entityType,
      });
    }
    if (query.entityId) {
      qb.andWhere('e.entityId = :entityId', { entityId: query.entityId });
    }
    if (query.from) qb.andWhere('e.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('e.createdAt <= :to', { to: query.to });
    if (query.before) {
      qb.andWhere('(e.createdAt, e.id) < (:beforeAt, :beforeId)', {
        beforeAt: query.before.createdAt,
        beforeId: query.before.id,
      });
    }
    return qb
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .take(query.limit)
      .getMany();
  }

  /** A page of the trail, newest first, with the total (activity feed). */
  page(
    businessId: string,
    page: number,
    limit: number,
  ): Promise<[AuditEvent[], number]> {
    return this.findAndCount({
      where: { businessId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
