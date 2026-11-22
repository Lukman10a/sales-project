import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);
  const requires = (...p: string[]) =>
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(p);

  const ctx = (user: unknown): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('allows when no permission is required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ role: 'cashier', permissions: [] }))).toBe(
      true,
    );
  });

  it('lets an owner through', () => {
    requires('staff.manage');
    expect(guard.canActivate(ctx({ role: 'owner', permissions: [] }))).toBe(
      true,
    );
  });

  it('allows staff holding any one of the required permissions', () => {
    requires('products.edit_price', 'products.restock');
    expect(
      guard.canActivate(
        ctx({ role: 'manager', permissions: ['products.restock'] }),
      ),
    ).toBe(true);
  });

  it('denies staff without them, and anonymous requests', () => {
    requires('sales.refund');
    expect(
      guard.canActivate(
        ctx({ role: 'cashier', permissions: ['sales.record'] }),
      ),
    ).toBe(false);
    expect(guard.canActivate(ctx(undefined))).toBe(false);
  });
});
