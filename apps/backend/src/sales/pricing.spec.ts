import { BadRequestException } from '@nestjs/common';
import {
  assertPayments,
  priceLine,
  refundShare,
  saleTotals,
  stockDemand,
} from './pricing';

const product = {
  id: 'p1',
  name: 'Rice',
  sellingPrice: 1250.5,
  cartonSize: 10,
  cartonPrice: 12000,
};

describe('pricing', () => {
  it('prices a unit line from the selling price, in kobo', () => {
    expect(
      priceLine(product, { productId: 'p1', quantity: 3, unit: 'unit' }),
    ).toEqual({
      productId: 'p1',
      productName: 'Rice',
      unit: 'unit',
      quantity: 3,
      unitsPerItem: 1,
      priceKobo: 125050,
      totalKobo: 375150,
    });
  });

  it('prices a carton from the carton price and counts its units', () => {
    const line = priceLine(product, {
      productId: 'p1',
      quantity: 2,
      unit: 'carton',
    });
    expect(line).toMatchObject({ priceKobo: 1200000, unitsPerItem: 10 });
    expect(stockDemand([line, line]).get('p1')).toBe(40);
  });

  it('refuses a carton when the product has no carton size or price', () => {
    for (const p of [
      { ...product, cartonSize: undefined },
      { ...product, cartonPrice: undefined },
      { ...product, cartonSize: 0 },
    ]) {
      expect(() =>
        priceLine(p, { productId: 'p1', quantity: 1, unit: 'carton' }),
      ).toThrow(BadRequestException);
    }
  });

  it('takes the discount, then 7.5% VAT, rounding to the kobo', () => {
    const line = priceLine(product, {
      productId: 'p1',
      quantity: 1,
      unit: 'unit',
    });
    expect(saleTotals([line], 0, false)).toEqual({
      subtotalKobo: 125050,
      discountKobo: 0,
      vatKobo: 0,
      totalKobo: 125050,
    });
    // 12.5% of 125050 = 15631.25 -> 15631; VAT on 109419 = 8206.43 -> 8206.
    expect(saleTotals([line], 12.5, true)).toEqual({
      subtotalKobo: 125050,
      discountKobo: 15631,
      vatKobo: 8206,
      totalKobo: 117625,
    });
  });

  describe('payments', () => {
    it('lets a single-method sale through without parts', () => {
      expect(() =>
        assertPayments({ paymentMethod: 'cash' }, 100),
      ).not.toThrow();
    });

    it('refuses parts on a single-method sale', () => {
      expect(() =>
        assertPayments(
          {
            paymentMethod: 'cash',
            splitPayments: [{ method: 'cash', amount: 1 }],
          },
          100,
        ),
      ).toThrow(BadRequestException);
    });

    it('needs two parts that add up to the total exactly', () => {
      const split = (...amounts: number[]) => ({
        paymentMethod: 'split',
        splitPayments: amounts.map((amount) => ({ method: 'cash', amount })),
      });
      expect(() => assertPayments(split(0.1, 0.2), 30)).not.toThrow();
      expect(() => assertPayments(split(1), 100)).toThrow(BadRequestException);
      expect(() => assertPayments(split(0.5, 0.49), 100)).toThrow(
        'add up to ₦0.99 but the total is ₦1',
      );
    });
  });

  it('refunds a share of what was actually paid', () => {
    expect(refundShare(10000, { subtotalKobo: 50000, totalKobo: 45000 })).toBe(
      9000,
    );
    expect(refundShare(10000, { subtotalKobo: 0, totalKobo: 0 })).toBe(0);
  });
});
