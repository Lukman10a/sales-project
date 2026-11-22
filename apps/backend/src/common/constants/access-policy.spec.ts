import { ForbiddenException } from '@nestjs/common';
import {
  assertMayDiscount,
  assertMayEditProduct,
  holds,
} from './access-policy';

const owner = {
  role: 'owner' as const,
  permissions: [],
  maxDiscountPercent: 0,
};
const manager = {
  role: 'manager' as const,
  permissions: [
    'sales.record' as const,
    'sales.discount' as const,
    'products.restock' as const,
  ],
  maxDiscountPercent: 10,
};
const cashier = {
  role: 'cashier' as const,
  permissions: ['sales.record' as const],
  maxDiscountPercent: 0,
};

describe('access policy', () => {
  it('owners hold every permission', () => {
    expect(holds(owner, 'billing.manage')).toBe(true);
    expect(holds(cashier, 'billing.manage')).toBe(false);
  });

  it('caps discounts at the member limit', () => {
    expect(() => assertMayDiscount(manager, 10)).not.toThrow();
    expect(() => assertMayDiscount(manager, 15)).toThrow('at most 10%');
    expect(() => assertMayDiscount(owner, 80)).not.toThrow();
  });

  it('refuses discounts without sales.discount, but allows none', () => {
    expect(() => assertMayDiscount(cashier, 5)).toThrow(ForbiddenException);
    expect(() => assertMayDiscount(cashier, 0)).not.toThrow();
  });

  it('lets restock-only members change the reorder point and supplier only', () => {
    expect(() =>
      assertMayEditProduct(manager, ['reorderPoint', 'supplier']),
    ).not.toThrow();
    expect(() =>
      assertMayEditProduct(manager, ['reorderPoint', 'sellingPrice']),
    ).toThrow('sellingPrice');
    expect(() => assertMayEditProduct(cashier, ['reorderPoint'])).toThrow(
      ForbiddenException,
    );
    expect(() => assertMayEditProduct(owner, ['sellingPrice'])).not.toThrow();
  });
});
