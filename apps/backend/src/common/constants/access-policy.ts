import { ForbiddenException } from '@nestjs/common';
import type { CurrentUserPayload } from '../interfaces/current-user-payload.interface';

type Holder = Pick<
  CurrentUserPayload,
  'role' | 'permissions' | 'maxDiscountPercent'
>;

/** Owners may do anything; staff need the permission on their member row. */
export const holds = (
  user: Holder,
  permission: CurrentUserPayload['permissions'][number],
) => user.role === 'owner' || user.permissions.includes(permission);

/** A discount needs sales.discount and must stay within the member's cap. */
export function assertMayDiscount(user: Holder, percent: number): void {
  if (percent <= 0 || user.role === 'owner') return;
  if (!holds(user, 'sales.discount')) {
    throw new ForbiddenException('You are not allowed to give discounts');
  }
  if (percent > user.maxDiscountPercent) {
    throw new ForbiddenException(
      `You can give at most ${user.maxDiscountPercent}% discount`,
    );
  }
}

/** Product fields a restock-only member may change. */
export const RESTOCK_FIELDS = new Set([
  'quantity',
  'reorderPoint',
  'lastRestocked',
  'supplier',
]);

/** Any other product field (name, prices, ...) needs products.edit_price. */
export function assertMayEditProduct(user: Holder, fields: string[]): void {
  if (holds(user, 'products.edit_price')) return;
  if (!holds(user, 'products.restock')) {
    throw new ForbiddenException('You are not allowed to change products');
  }
  const blocked = fields.filter((f) => !RESTOCK_FIELDS.has(f));
  if (blocked.length > 0) {
    throw new ForbiddenException(
      `Changing ${blocked.join(', ')} needs permission to edit prices`,
    );
  }
}
