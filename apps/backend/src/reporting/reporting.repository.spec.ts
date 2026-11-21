import type { DataSource } from 'typeorm';
import { ReportingRepository } from './reporting.repository';

describe('ReportingRepository', () => {
  let query: jest.Mock;
  let repo: ReportingRepository;
  const range = { from: '2026-11-01', to: '2026-11-07' };
  const call = (n = 0) => query.mock.calls[n] as [string, unknown[]];

  beforeEach(() => {
    query = jest.fn();
    repo = new ReportingRepository({ query } as unknown as DataSource);
  });

  it('totals a period by Lagos business day, net of VAT and refunds', async () => {
    query.mockResolvedValue([
      {
        sales: '150000.4',
        sale_count: '3',
        staff: '2',
        units: '7',
        cogs: '90000',
      },
    ]);

    await expect(repo.totals('b1', range)).resolves.toEqual({
      sales: 1500,
      cogs: 900,
      itemsSold: 7,
      saleCount: 3,
      staffCount: 2,
    });
    const [sql, params] = call();
    expect(params).toEqual(['b1', '2026-11-01', '2026-11-07']);
    expect(sql).toContain('s."businessId" = $1');
    expect(sql).toContain('s."saleDate" BETWEEN $2 AND $3');
    expect(sql).toContain('"vatAmount"');
    expect(sql).toContain('"refundAmount"');
    expect(sql).toContain('si."unitCost"');
    expect(sql).not.toContain('$4');
  });

  it('applies a time-of-day cutoff in Lagos time', async () => {
    query.mockResolvedValue([{}]);

    await expect(repo.totals('b1', range, '10:15:00')).resolves.toEqual({
      sales: 0,
      cogs: 0,
      itemsSold: 0,
      saleCount: 0,
      staffCount: 0,
    });
    const [sql, params] = call();
    expect(params[3]).toBe('10:15:00');
    expect(sql).toContain(`AT TIME ZONE 'Africa/Lagos')::time <= $4::time`);
  });

  it('zero-fills a daily series', async () => {
    query.mockResolvedValue([
      { day: '2026-11-01', sales: '0', cogs: '0' },
      { day: '2026-11-02', sales: '2500', cogs: '1000' },
    ]);

    await expect(repo.daily('b1', range)).resolves.toEqual([
      { date: '2026-11-01', sales: 0, cogs: 0 },
      { date: '2026-11-02', sales: 25, cogs: 10 },
    ]);
    expect(call()[0]).toContain('generate_series');
  });

  it('orders top products only by a known column', async () => {
    query.mockResolvedValue([
      {
        product_id: 'p1',
        name: 'Rice',
        units: '4',
        revenue: '40000',
        cogs: '30000',
      },
    ]);

    await expect(repo.topProducts('b1', range, 'units', 5)).resolves.toEqual([
      { productId: 'p1', name: 'Rice', units: 4, revenue: 400, cogs: 300 },
    ]);
    expect(call()[0]).toContain('ORDER BY units DESC');
    expect(call()[1]).toEqual(['b1', '2026-11-01', '2026-11-07', 5]);
  });

  it('splits takings by payment method, expanding split payments', async () => {
    query.mockResolvedValue([{ method: 'cash', amount: '30000', sales: '2' }]);

    await expect(repo.paymentMethods('b1', range)).resolves.toEqual([
      { method: 'cash', amount: 300, saleCount: 2 },
    ]);
    expect(call()[0]).toContain('jsonb_array_elements');
  });

  it('counts products to restock for the business', async () => {
    query.mockResolvedValue([{ n: '4' }]);

    await expect(repo.restockCount('b1')).resolves.toBe(4);
    expect(call()[1]).toEqual(['b1']);
  });
});
