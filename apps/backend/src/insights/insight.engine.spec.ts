import { generateInsights, __test__ } from './insight.engine';
import type { InsightEngineInput } from './insight.types';

function baseInput(
  overrides: Partial<InsightEngineInput> = {},
): InsightEngineInput {
  return {
    inventory: [],
    velocities: [],
    coPurchasePairs: [],
    ...overrides,
  };
}

describe('insight.engine', () => {
  describe('restock', () => {
    it('emits high when days-to-stockout <= 3 and quantity <= reorderPoint', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Widget',
            quantity: 3,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      const out = generateInsights(input);
      const restock = out.find((i) => i.type === 'restock');
      expect(restock).toBeDefined();
      expect(restock!.priority).toBe('high');
      expect(restock!.metrics.some((m) => m.label === 'Days to stockout')).toBe(
        true,
      );
    });

    it('emits medium when days-to-stockout <=7', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Widget',
            quantity: 7,
            reorderPoint: 10,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      const out = generateInsights(input);
      expect(out.find((i) => i.type === 'restock')!.priority).toBe('medium');
    });

    it('does not emit restock when days >7 and quantity above reorder', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Widget',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [{ productId: 'p1', unitsSold30d: 3, unitsSoldPrev30d: 1 }],
      });
      expect(
        generateInsights(input).filter((i) => i.type === 'restock'),
      ).toHaveLength(0);
    });

    it('uses default reorder 5 when undefined', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Widget',
            quantity: 4,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      const out = generateInsights(input);
      expect(out.find((i) => i.type === 'restock')).toBeDefined();
    });
  });

  describe('trending', () => {
    it('emits medium at >=25% growth with min volume', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Trendy',
            quantity: 50,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 20, unitsSoldPrev30d: 16 },
        ],
      });
      const out = generateInsights(input);
      const t = out.find((i) => i.type === 'trending');
      expect(t).toBeDefined();
      expect(t!.priority).toBe('medium');
    });

    it('emits high at >=50% growth', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Trendy',
            quantity: 50,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      expect(
        generateInsights(input).find((i) => i.type === 'trending')!.priority,
      ).toBe('high');
    });

    it('does not emit trending below min volume', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Tiny',
            quantity: 50,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [{ productId: 'p1', unitsSold30d: 5, unitsSoldPrev30d: 1 }],
      });
      expect(
        generateInsights(input).filter((i) => i.type === 'trending'),
      ).toHaveLength(0);
    });

    it('guards min-volume edge at threshold', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Edge',
            quantity: 50,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          {
            productId: 'p1',
            unitsSold30d: __test__.MIN_TRENDING_VOLUME,
            unitsSoldPrev30d: 5,
          },
        ],
      });
      expect(
        generateInsights(input).filter((i) => i.type === 'trending'),
      ).toHaveLength(1);
    });
  });

  describe('warning / slow-mover', () => {
    it('emits warning when low units and days-to-clear > threshold', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Slow',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 5,
            sellingPrice: 10,
            category: [],
          },
        ],
        velocities: [{ productId: 'p1', unitsSold30d: 1, unitsSoldPrev30d: 1 }],
      });
      const out = generateInsights(input);
      expect(out.find((i) => i.type === 'warning')).toBeDefined();
    });

    it('does not emit warning when high volume', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Fast',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 5,
            sellingPrice: 10,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      expect(
        generateInsights(input).filter((i) => i.type === 'warning'),
      ).toHaveLength(0);
    });
  });

  describe('pricing', () => {
    it('emits pricing when above avg velocity and healthy margin', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Star',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'Avg',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p3',
            name: 'Avg2',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 90, unitsSoldPrev30d: 30 },
          { productId: 'p2', unitsSold30d: 3, unitsSoldPrev30d: 3 },
          { productId: 'p3', unitsSold30d: 3, unitsSoldPrev30d: 3 },
        ],
      });
      const out = generateInsights(input);
      expect(
        out.find((i) => i.type === 'pricing' && i.id === 'pricing:p1'),
      ).toBeDefined();
    });

    it('does not emit pricing for near-stockout items', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'NearOut',
            quantity: 2,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'Avg',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 90, unitsSoldPrev30d: 30 },
          { productId: 'p2', unitsSold30d: 1, unitsSoldPrev30d: 1 },
        ],
      });
      expect(
        generateInsights(input).filter(
          (i) => i.type === 'pricing' && i.id === 'pricing:p1',
        ),
      ).toHaveLength(0);
    });

    it('does not emit pricing for negative or low margin', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'LowMargin',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 18,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'Avg',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 90, unitsSoldPrev30d: 30 },
          { productId: 'p2', unitsSold30d: 1, unitsSoldPrev30d: 1 },
        ],
      });
      expect(
        generateInsights(input).filter(
          (i) => i.type === 'pricing' && i.id === 'pricing:p1',
        ),
      ).toHaveLength(0);
    });

    it('does not emit pricing for negative margin (wholesale > selling)', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'NegMargin',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 25,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'Avg',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 90, unitsSoldPrev30d: 30 },
          { productId: 'p2', unitsSold30d: 1, unitsSoldPrev30d: 1 },
        ],
      });
      expect(
        generateInsights(input).filter((i) => i.type === 'pricing'),
      ).toHaveLength(0);
    });
  });

  describe('opportunity / co-purchase', () => {
    it('emits bundle from co-purchase pairs', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'A',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'B',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 10, unitsSoldPrev30d: 10 },
          { productId: 'p2', unitsSold30d: 10, unitsSoldPrev30d: 10 },
        ],
        coPurchasePairs: [
          {
            productIdA: 'p1',
            productIdB: 'p2',
            nameA: 'A',
            nameB: 'B',
            count: 5,
          },
        ],
      });
      expect(
        generateInsights(input).find((i) => i.type === 'opportunity'),
      ).toBeDefined();
    });

    it('skips co-purchase when either product near stockout', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'A',
            quantity: 1,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'B',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
          { productId: 'p2', unitsSold30d: 10, unitsSoldPrev30d: 10 },
        ],
        coPurchasePairs: [
          {
            productIdA: 'p1',
            productIdB: 'p2',
            nameA: 'A',
            nameB: 'B',
            count: 5,
          },
        ],
      });
      expect(
        generateInsights(input).filter((i) => i.type === 'opportunity'),
      ).toHaveLength(0);
    });
  });

  describe('ordering, dedupe, cap', () => {
    it('orders by priority high > medium > low', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'RestockHigh',
            quantity: 1,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
          {
            productId: 'p2',
            name: 'Slow',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
          { productId: 'p2', unitsSold30d: 1, unitsSoldPrev30d: 1 },
        ],
      });
      const out = generateInsights(input);
      const idxHigh = out.findIndex((i) => i.id === 'restock:p1');
      const idxLow = out.findIndex((i) => i.id === 'warning:p2');
      expect(idxHigh).toBeLessThan(idxLow);
    });

    it('deduplicates by id', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'A',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 10, unitsSoldPrev30d: 10 },
        ],
        coPurchasePairs: [
          {
            productIdA: 'p1',
            productIdB: 'p2',
            nameA: 'A',
            nameB: 'B',
            count: 5,
          },
          {
            productIdA: 'p1',
            productIdB: 'p2',
            nameA: 'A',
            nameB: 'B',
            count: 5,
          },
        ],
      });
      // Add second inventory for p2 to make pair valid but dedup should keep one opportunity
      input.inventory.push({
        productId: 'p2',
        name: 'B',
        quantity: 100,
        reorderPoint: 5,
        costPrice: 10,
        sellingPrice: 20,
        category: [],
      });
      input.velocities.push({
        productId: 'p2',
        unitsSold30d: 10,
        unitsSoldPrev30d: 10,
      });
      const out = generateInsights(input);
      const opp = out.filter((i) => i.type === 'opportunity');
      expect(opp).toHaveLength(1);
    });

    it('caps at N', () => {
      const input = baseInput({
        inventory: Array.from({ length: 15 }, (_, i) => ({
          productId: `p${i}`,
          name: `Item${i}`,
          quantity: 1,
          reorderPoint: 5,
          costPrice: 10,
          sellingPrice: 20,
          category: [],
        })),
        velocities: Array.from({ length: 15 }, (_, i) => ({
          productId: `p${i}`,
          unitsSold30d: 30,
          unitsSoldPrev30d: 10,
        })),
      });
      expect(generateInsights(input, 10)).toHaveLength(10);
      expect(generateInsights(input, 5)).toHaveLength(5);
    });

    it('each insight carries supporting metrics', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Widget',
            quantity: 1,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      const out = generateInsights(input);
      for (const ins of out) {
        expect(ins.metrics.length).toBeGreaterThan(0);
        expect(ins.metrics[0].label).toBeDefined();
        expect(ins.metrics[0].value).toBeDefined();
      }
    });

    it('never recommends pricing for near-stockout', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Near',
            quantity: 1,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 100,
            category: [],
          },
          {
            productId: 'p2',
            name: 'Avg',
            quantity: 100,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 60, unitsSoldPrev30d: 10 },
          { productId: 'p2', unitsSold30d: 1, unitsSoldPrev30d: 1 },
        ],
      });
      expect(
        generateInsights(input).filter(
          (i) => i.type === 'pricing' && i.id === 'pricing:p1',
        ),
      ).toHaveLength(0);
    });

    it('is deterministic', () => {
      const input = baseInput({
        inventory: [
          {
            productId: 'p1',
            name: 'Widget',
            quantity: 2,
            reorderPoint: 5,
            costPrice: 10,
            sellingPrice: 20,
            category: [],
          },
        ],
        velocities: [
          { productId: 'p1', unitsSold30d: 30, unitsSoldPrev30d: 10 },
        ],
      });
      expect(generateInsights(input)).toEqual(generateInsights(input));
    });
  });
});
