import { NotFoundException } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightRepository } from './insight.repository';

describe('InsightsService', () => {
  let service: InsightsService;
  let repo: {
    inventoryFacts: jest.Mock;
    salesVelocity: jest.Mock;
    coPurchasePairs: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      inventoryFacts: jest.fn().mockResolvedValue([]),
      salesVelocity: jest.fn().mockResolvedValue([]),
      coPurchasePairs: jest.fn().mockResolvedValue([]),
    };
    service = new InsightsService(repo as unknown as InsightRepository);
  });

  it('computes live insights scoped to businessId', async () => {
    repo.inventoryFacts.mockResolvedValue([
      {
        productId: 'p1',
        name: 'Widget',
        quantity: 2,
        reorderPoint: 5,
        wholesalePrice: 10,
        sellingPrice: 20,
        category: [],
      },
    ]);
    repo.salesVelocity.mockResolvedValue([
      { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
    ]);
    repo.coPurchasePairs.mockResolvedValue([]);

    const out = await service.list({ businessId: 'b1' }, { limit: 10 });
    expect(repo.inventoryFacts).toHaveBeenCalledWith('b1');
    expect(repo.salesVelocity).toHaveBeenCalled();
    expect(out.some((i) => i.type === 'restock')).toBe(true);
    expect(out.every((i) => i.metrics.length > 0)).toBe(true);
  });

  it('filters by type and priority and caps at limit', async () => {
    repo.inventoryFacts.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        productId: `p${i}`,
        name: `Item${i}`,
        quantity: 1,
        reorderPoint: 5,
        wholesalePrice: 10,
        sellingPrice: 20,
        category: [],
      })),
    );
    repo.salesVelocity.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        productId: `p${i}`,
        unitsSold30d: 30,
        unitsSoldPrev30d: 10,
      })),
    );

    const out = await service.list(
      { businessId: 'b1' },
      { limit: 5, type: 'restock' },
    );
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.every((i) => i.type === 'restock')).toBe(true);
  });

  it('isolates business: passes its businessId to all repo calls', async () => {
    await service.list({ businessId: 'b-other' }, { limit: 10 });
    expect(repo.inventoryFacts).toHaveBeenCalledWith('b-other');
    expect(repo.coPurchasePairs).toHaveBeenCalledWith(
      'b-other',
      expect.any(Number),
    );
  });

  it('guardrails: does not return pricing for near-stockout or negative margin', async () => {
    repo.inventoryFacts.mockResolvedValue([
      {
        productId: 'p1',
        name: 'Near',
        quantity: 1,
        reorderPoint: 5,
        wholesalePrice: 25,
        sellingPrice: 20,
        category: [],
      },
    ]);
    repo.salesVelocity.mockResolvedValue([
      { productId: 'p1', unitsSold30d: 60, unitsSoldPrev30d: 10 },
    ]);

    const out = await service.list({ businessId: 'b1' }, { limit: 10 });
    expect(out.filter((i) => i.type === 'pricing')).toHaveLength(0);
  });

  it('findOne returns matching insight and throws 404 when missing', async () => {
    repo.inventoryFacts.mockResolvedValue([
      {
        productId: 'p1',
        name: 'Widget',
        quantity: 1,
        reorderPoint: 5,
        wholesalePrice: 10,
        sellingPrice: 20,
        category: [],
      },
    ]);
    repo.salesVelocity.mockResolvedValue([
      { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
    ]);

    const list = await service.list({ businessId: 'b1' }, { limit: 10 });
    const id = list[0].id;
    await expect(
      service.findOne({ businessId: 'b1' }, id),
    ).resolves.toMatchObject({ id });
    await expect(
      service.findOne({ businessId: 'b1' }, 'missing:id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ensures zero-velocity products are included', async () => {
    repo.inventoryFacts.mockResolvedValue([
      {
        productId: 'p1',
        name: 'NoSales',
        quantity: 100,
        reorderPoint: 5,
        wholesalePrice: 10,
        sellingPrice: 20,
        category: [],
      },
    ]);
    repo.salesVelocity.mockResolvedValue([]);
    repo.coPurchasePairs.mockResolvedValue([]);

    const out = await service.list({ businessId: 'b1' }, { limit: 10 });
    // Slow mover should appear for no-sales high qty
    expect(out.some((i) => i.type === 'warning')).toBe(true);
  });
});
