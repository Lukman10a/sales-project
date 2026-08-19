import { CreateSaleDtoSchema } from './create-sale.dto';

describe('CreateSaleDtoSchema', () => {
  it('accepts splitPayments, loyaltyPointsUsed and accountCredit', () => {
    const parsed = CreateSaleDtoSchema.parse({
      items: [
        {
          productId: '11111111-1111-4111-8111-111111111111',
          quantity: 2,
          price: 50,
        },
      ],
      paymentMethod: 'split',
      splitPayments: [
        { method: 'cash', amount: 50 },
        { method: 'card', amount: 50 },
      ],
      loyaltyPointsUsed: 10,
      accountCredit: 20,
    });

    expect(parsed.splitPayments).toEqual([
      { method: 'cash', amount: 50 },
      { method: 'card', amount: 50 },
    ]);
    expect(parsed.loyaltyPointsUsed).toBe(10);
    expect(parsed.accountCredit).toBe(20);
  });

  it('still rejects unknown fields', () => {
    expect(() =>
      CreateSaleDtoSchema.parse({
        items: [
          {
            productId: '11111111-1111-4111-8111-111111111111',
            quantity: 1,
            price: 10,
          },
        ],
        madeUpField: true,
      }),
    ).toThrow();
  });
});
