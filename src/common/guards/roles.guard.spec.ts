import { ExecutionContext, Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

  beforeEach(() => {
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  const mockContext = (user: { role: string } | undefined): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows when no roles metadata is set', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'manager' }))).toBe(true);
  });

  it('allows owner regardless of required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'manager',
      'sales-assistant',
    ]);
    expect(guard.canActivate(mockContext({ role: 'owner' }))).toBe(true);
  });

  it('allows a user whose role matches the required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'manager',
      'apprentice',
    ]);
    expect(guard.canActivate(mockContext({ role: 'apprentice' }))).toBe(true);
  });

  it('blocks a user whose role is not in the required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['manager']);
    expect(guard.canActivate(mockContext({ role: 'checkout' }))).toBe(false);
  });

  it('blocks when no user is attached to the request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['manager']);
    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });
});
