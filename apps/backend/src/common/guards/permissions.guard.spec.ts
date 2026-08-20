import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ROLE_DEFAULT_PERMISSIONS } from '../constants/permissions';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

  beforeEach(() => {
    guard = new PermissionsGuard(reflector);
    jest.clearAllMocks();
  });

  const mockContext = (
    user: { role: string; permissions?: string[] } | undefined,
  ): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows when no permissions metadata is set', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'manager' }))).toBe(true);
  });

  it('allows owner regardless of required permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'record-sales',
      'edit-inventory',
    ]);
    expect(guard.canActivate(mockContext({ role: 'owner' }))).toBe(true);
  });

  it('allows a user holding all required permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'record-sales',
      'view-inventory',
    ]);
    const user = {
      role: 'manager',
      permissions: ['record-sales', 'view-inventory'],
    };
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('allows a user holding only one of the required permissions (OR semantics)', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'view-inventory',
      'view-products',
    ]);
    const user = { role: 'manager', permissions: ['view-products'] };
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('blocks a user holding none of the required permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'edit-inventory',
      'edit-products',
    ]);
    const user = { role: 'manager', permissions: ['record-sales'] };
    expect(guard.canActivate(mockContext(user))).toBe(false);
  });

  it('default manager role includes edit-inventory', () => {
    expect(ROLE_DEFAULT_PERMISSIONS.manager).toContain('edit-inventory');
  });

  it('lets a default manager pass the inventory create/edit guard', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'edit-inventory',
      'edit-products',
    ]);
    const user = {
      role: 'manager',
      permissions: [...ROLE_DEFAULT_PERMISSIONS.manager],
    };
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('blocks a user with no permissions when permissions are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'record-sales',
    ]);
    expect(guard.canActivate(mockContext({ role: 'manager' }))).toBe(false);
  });

  it('blocks when no user is attached to the request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'record-sales',
    ]);
    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });
});
