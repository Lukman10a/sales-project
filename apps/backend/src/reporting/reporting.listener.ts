import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReportCache } from './report-cache';

/** Clears a business's cached reports when its figures change. */
@Injectable()
export class ReportingListener {
  constructor(private readonly cache: ReportCache) {}

  @OnEvent('sale.completed')
  @OnEvent('sale.refunded')
  @OnEvent('expense.changed')
  invalidate(event: { businessId: string }): void {
    this.cache.invalidate(event.businessId);
  }
}
