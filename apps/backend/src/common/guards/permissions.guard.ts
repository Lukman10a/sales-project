import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const user = context
      .switchToHttp()
      .getRequest<{ user?: { role: string; permissions?: string[] } }>().user;
    if (!user) return false;
    if (user.role === 'owner') return true;

    const userPermissions = user.permissions ?? [];
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }
}
