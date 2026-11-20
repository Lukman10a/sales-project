import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { tenantOf } from './current-tenant.decorator';

const ctx = (user: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('CurrentTenant', () => {
  it("returns the principal's business id", () => {
    expect(tenantOf(ctx({ id: 'u1', businessId: 'b1' }))).toBe('b1');
  });

  it('refuses a request without an authenticated tenant', () => {
    expect(() => tenantOf(ctx(undefined))).toThrow(UnauthorizedException);
    expect(() => tenantOf(ctx({ id: 'u1' }))).toThrow(UnauthorizedException);
  });
});
