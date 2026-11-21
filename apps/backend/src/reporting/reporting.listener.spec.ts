import type { ReportStore } from './report-cache';
import { ReportingListener } from './reporting.listener';

describe('ReportingListener', () => {
  it("clears the business's cached reports", async () => {
    const cache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    const listener = new ReportingListener(cache as unknown as ReportStore);

    await listener.invalidate({ businessId: 'b1' });

    expect(cache.invalidate).toHaveBeenCalledWith('b1');
  });

  it('listens for sales, refunds and expense changes', () => {
    const events = (
      Reflect.getMetadata(
        'EVENT_LISTENER_METADATA',
        Object.getOwnPropertyDescriptor(
          ReportingListener.prototype,
          'invalidate',
        )!.value as object,
      ) as Array<{ event: string }>
    ).map((m) => m.event);
    expect(events.sort()).toEqual([
      'expense.changed',
      'sale.completed',
      'sale.refunded',
    ]);
  });
});
