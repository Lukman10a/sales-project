import type { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { StockIntegrityListener } from './stock-integrity.listener';
import type { StockLedgerRepository } from './stock-ledger.repository';

describe('StockIntegrityListener', () => {
  const mismatch = (businessId: string, productId: string) => ({
    businessId,
    productId,
    name: productId,
    quantity: 1,
    ledger: 2,
  });

  it('tells each business with drift, once, and logs it', async () => {
    const ledger = {
      mismatches: jest
        .fn()
        .mockResolvedValue([
          mismatch('b1', 'p1'),
          mismatch('b1', 'p2'),
          mismatch('b2', 'p3'),
        ]),
    };
    const events = { emit: jest.fn() };
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const listener = new StockIntegrityListener(
      ledger as unknown as StockLedgerRepository,
      events as unknown as EventEmitter2,
    );

    await expect(listener.check()).resolves.toHaveLength(3);

    expect(events.emit).toHaveBeenCalledTimes(2);
    expect(events.emit).toHaveBeenCalledWith('inventory.ledger-mismatch', {
      businessId: 'b1',
      products: [mismatch('b1', 'p1'), mismatch('b1', 'p2')],
    });
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it('stays quiet when every product matches its ledger', async () => {
    const events = { emit: jest.fn() };
    const listener = new StockIntegrityListener(
      {
        mismatches: jest.fn().mockResolvedValue([]),
      } as unknown as StockLedgerRepository,
      events as unknown as EventEmitter2,
    );
    await listener.check();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
