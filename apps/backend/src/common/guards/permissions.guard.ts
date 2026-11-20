import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { Permission } from '../constants/permissions';
import type { CurrentUserPayload } from '../interfaces/current-user-payload.interface';

/**
 * Checks @RequirePermissions against the principal JwtStrategy resolved for
 * this request (fresh from the database, not from the token).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{
      user?: Pick<CurrentUserPayload, 'role' | 'permissions'>;
    }>().user;
    if (!user) return false;
    if (user.role === 'owner') return true;
    return required.some((p) => user.permissions.includes(p));
  }
}
