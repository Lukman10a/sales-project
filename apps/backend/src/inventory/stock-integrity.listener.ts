import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobRegistry } from '../jobs/job-registry';
import {
  StockLedgerRepository,
  type LedgerMismatch,
} from './stock-ledger.repository';

/** Emitted per business when the nightly check finds drift. */
export interface LedgerMismatchEvent {
  businessId: string;
  products: LedgerMismatch[];
}

/**
 * Nightly check that every product's quantity equals the sum of its stock
 * movements. Drift means some code changed stock outside the ledger; the
 * owner is told (see NotificationsListener) and it is logged as an error.
 */
@Injectable()
export class StockIntegrityListener implements OnModuleInit {
  private readonly logger = new Logger(StockIntegrityListener.name);

  constructor(
    private ledger: StockLedgerRepository,
    private eventEmitter: EventEmitter2,
    private jobs: JobRegistry,
  ) {}

  /** A `maintenance` job at 02:30 Lagos, once across instances. */
  onModuleInit(): void {
    this.jobs.handle('maintenance', 'stock-integrity', () => this.check());
    this.jobs.schedule(
      'maintenance',
      'stock-integrity',
      process.env.STOCK_INTEGRITY_CRON ?? '30 2 * * *',
    );
  }

  async check(): Promise<LedgerMismatch[]> {
    const mismatches = await this.ledger.mismatches();
    const byBusiness = new Map<string, LedgerMismatch[]>();
    for (const m of mismatches) {
      byBusiness.set(m.businessId, [
        ...(byBusiness.get(m.businessId) ?? []),
        m,
      ]);
    }
    for (const [businessId, products] of byBusiness) {
      this.logger.error(
        `Stock ledger drift in business ${businessId}: ${products
          .map(
            (p) =>
              `${p.productId} quantity ${p.quantity} vs ledger ${p.ledger}`,
          )
          .join('; ')}`,
      );
      const event: LedgerMismatchEvent = { businessId, products };
      this.eventEmitter.emit('inventory.ledger-mismatch', event);
    }
    return mismatches;
  }
}
