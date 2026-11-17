import { buildDemoData, prng, stockStatus } from './demo-data';

const NOW = new Date('2026-11-17T12:00:00Z');

describe('buildDemoData', () => {
  it('is deterministic', () => {
    expect(buildDemoData(NOW)).toEqual(buildDemoData(NOW));
    expect(prng(1)()).toBe(prng(1)());
  });

  it('creates 20 products and roughly 30 days of sales', () => {
    const { products, sales } = buildDemoData(NOW);
    expect(products).toHaveLength(20);
    expect(sales.length).toBeGreaterThan(60);
    const days = new Set(
      sales.map((s) => s.saleDate.toISOString().slice(0, 10)),
    );
    expect(days.size).toBe(30);
    expect(sales.every((s) => s.saleDate <= NOW)).toBe(true);
  });

  it('keeps totals, stock and sold counts consistent', () => {
    const { products, sales } = buildDemoData(NOW);
    for (const sale of sales) {
      expect(sale.total).toBe(sale.items.reduce((s, i) => s + i.total, 0));
    }
    const soldBySku = new Map<string, number>();
    for (const item of sales.flatMap((s) => s.items)) {
      soldBySku.set(item.sku, (soldBySku.get(item.sku) ?? 0) + item.quantity);
    }
    for (const p of products) {
      expect(p.sold).toBe(soldBySku.get(p.sku) ?? 0);
      expect(p.quantity).toBeGreaterThanOrEqual(0);
      expect(p.sellingPrice).toBeGreaterThan(p.wholesalePrice);
    }
  });
});

describe('stockStatus', () => {
  it('derives status from quantity and reorder point', () => {
    expect(stockStatus(0, 10)).toBe('out-of-stock');
    expect(stockStatus(10, 10)).toBe('low-stock');
    expect(stockStatus(11, 10)).toBe('in-stock');
  });
});
