import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { CurrentUserPayload } from '../interfaces/current-user-payload.interface';

/** The authenticated principal's business id, the tenant for every query. */
export function tenantOf(ctx: ExecutionContext): string {
  const req = ctx
    .switchToHttp()
    .getRequest<{ user?: Partial<CurrentUserPayload> }>();
  const businessId = req.user?.businessId;
  if (!businessId) throw new UnauthorizedException();
  return businessId;
}

/**
 * `@CurrentTenant() businessId: string` — use after JwtAuthGuard. Pass it as
 * the first argument to tenant repositories.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => tenantOf(ctx),
);
