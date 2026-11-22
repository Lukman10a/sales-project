import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReportStore } from './report-cache';

/** Clears a business's cached reports when its figures change. */
@Injectable()
export class ReportingListener {
  constructor(private readonly cache: ReportStore) {}

  @OnEvent('sale.completed')
  @OnEvent('sale.refunded')
  @OnEvent('expense.changed')
  invalidate(event: { businessId: string }): Promise<void> {
    return this.cache.invalidate(event.businessId);
  }
}
