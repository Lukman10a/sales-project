import { CreateSaleDtoSchema } from './create-sale.dto';
import { RefundSaleDtoSchema } from './refund-sale.dto';
import { CreateHeldTransactionDtoSchema } from './create-held-transaction.dto';

const productId = '11111111-1111-4111-8111-111111111111';

describe('CreateSaleDtoSchema', () => {
  it('takes product, quantity and unit; the unit defaults to unit', () => {
    const parsed = CreateSaleDtoSchema.parse({
      items: [
        { productId, quantity: 2 },
        { productId, quantity: 1, unit: 'carton' },
      ],
      paymentMethod: 'split',
      splitPayments: [
        { method: 'cash', amount: 50 },
        { method: 'card', amount: 50 },
      ],
      loyaltyPointsUsed: 10,
      accountCredit: 20,
    });

    expect(parsed.items).toEqual([
      { productId, quantity: 2, unit: 'unit' },
      { productId, quantity: 1, unit: 'carton' },
    ]);
    expect(parsed.splitPayments).toHaveLength(2);
  });

  it('throws a client price away: the server prices every line', () => {
    expect(
      CreateSaleDtoSchema.parse({
        items: [{ productId, quantity: 1, price: 0 }],
      }).items,
    ).toEqual([{ productId, quantity: 1, unit: 'unit' }]);
  });

  it('still rejects unknown fields', () => {
    expect(() =>
      CreateSaleDtoSchema.parse({
        items: [{ productId, quantity: 1 }],
        madeUpField: true,
      }),
    ).toThrow();
  });

  it('refuses a zero or negative split part', () => {
    expect(() =>
      CreateSaleDtoSchema.parse({
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'split',
        splitPayments: [{ method: 'cash', amount: 0 }],
      }),
    ).toThrow();
  });
});

describe('RefundSaleDtoSchema', () => {
  it('requires a reason', () => {
    expect(() => RefundSaleDtoSchema.parse({})).toThrow();
    expect(() => RefundSaleDtoSchema.parse({ refundReason: '  ' })).toThrow();
    expect(RefundSaleDtoSchema.parse({ refundReason: 'damaged' })).toEqual({
      refundReason: 'damaged',
    });
  });

  it('takes per-line quantities and no amount', () => {
    expect(() =>
      RefundSaleDtoSchema.parse({ refundReason: 'x', refundAmount: 5 }),
    ).toThrow();
    expect(
      RefundSaleDtoSchema.parse({
        refundReason: 'x',
        items: [{ saleItemId: productId, quantity: 1 }],
      }).items,
    ).toEqual([{ saleItemId: productId, quantity: 1 }]);
  });
});

describe('CreateHeldTransactionDtoSchema', () => {
  it('holds a cart without prices', () => {
    expect(
      CreateHeldTransactionDtoSchema.parse({
        customerName: 'Walk-in',
        items: [{ productId, quantity: 1, price: 10 }],
      }).items,
    ).toEqual([{ productId, quantity: 1, unit: 'unit' }]);
  });
});
