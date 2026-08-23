import { NotFoundException } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightRepository } from './insight.repository';

describe('InsightsService', () => {
  let service: InsightsService;
  let repo: {
    inventoryFacts: jest.Mock;
    salesVelocity: jest.Mock;
    coPurchasePairs: jest.Mock;
    findNarratives: jest.Mock;
    saveNarratives: jest.Mock;
  };
  let llm: { generateNarratives: jest.Mock };

  beforeEach(() => {
    repo = {
      inventoryFacts: jest.fn().mockResolvedValue([]),
      salesVelocity: jest.fn().mockResolvedValue([]),
      coPurchasePairs: jest.fn().mockResolvedValue([]),
      findNarratives: jest.fn().mockResolvedValue(new Map()),
      saveNarratives: jest.fn().mockResolvedValue(undefined),
    };
    llm = { generateNarratives: jest.fn() };
    service = new InsightsService(repo as unknown as InsightRepository, llm);
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
    expect(out.some((i) => i.type === 'warning')).toBe(true);
  });

  it('merges persisted narratives on list', async () => {
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
    repo.findNarratives.mockResolvedValue(
      new Map([['restock:p1', 'AI narrative']]),
    );
    const out = await service.list({ businessId: 'b1' }, { limit: 10 });
    expect(out.find((i) => i.id === 'restock:p1')?.description).toBe(
      'AI narrative',
    );
  });

  describe('generate', () => {
    it('with disabled provider uses template text and does not call network', async () => {
      const svcNoProvider = new InsightsService(
        repo as unknown as InsightRepository,
      );
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
      const out = await svcNoProvider.generate(
        { businessId: 'b1' },
        { limit: 10 },
      );
      expect(out.length).toBeGreaterThan(0);
      // Noop provider returns template, persisted
      expect(repo.saveNarratives).toHaveBeenCalled();
    });

    it('persists narratives from provider and returns refreshed list', async () => {
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
      llm.generateNarratives.mockResolvedValue(
        new Map([['restock:p1', 'Generated narrative']]),
      );
      // second list call after save returns narrative
      repo.findNarratives
        .mockResolvedValueOnce(new Map())
        .mockResolvedValueOnce(
          new Map([['restock:p1', 'Generated narrative']]),
        );
      const out = await service.generate({ businessId: 'b1' }, { limit: 10 });
      expect(llm.generateNarratives).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const arg = llm.generateNarratives.mock.calls[0][0] as {
        description: string;
      }[];
      // Ensure only aggregated facts sent (no customer names)
      expect(JSON.stringify(arg)).not.toContain('customer');
      expect(repo.saveNarratives).toHaveBeenCalledWith('b1', expect.any(Map));
      expect(out.some((i) => i.description === 'Generated narrative')).toBe(
        true,
      );
    });

    it('falls back to template on provider failure', async () => {
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
      llm.generateNarratives.mockRejectedValue(new Error('API error'));
      const out = await service.generate({ businessId: 'b1' }, { limit: 10 });
      expect(out.length).toBeGreaterThan(0);
      expect(repo.saveNarratives).toHaveBeenCalled();
    });

    it('only sends aggregated facts (no PII)', async () => {
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
      llm.generateNarratives.mockResolvedValue(new Map());
      await service.generate({ businessId: 'b1' }, { limit: 10 });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const insightsArg = llm.generateNarratives.mock.calls[0][0] as unknown[];
      const serialized = JSON.stringify(insightsArg);
      expect(serialized).not.toMatch(/customer/i);
      expect(serialized).not.toMatch(/John Doe/);
    });
  });
});
