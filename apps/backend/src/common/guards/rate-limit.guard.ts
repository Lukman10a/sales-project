import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  GLOBAL_RULE,
  RATE_LIMIT_RULES,
  type RateLimitRule,
} from '../rate-limit/rate-limit.decorator';
import {
  RATE_LIMIT_STORE,
  type RateLimitStore,
} from '../rate-limit/rate-limit.store';
import type { CurrentUserPayload } from '../interfaces/current-user-payload.interface';

type LimitedRequest = Request & {
  user?: CurrentUserPayload;
  rateLimited?: Set<string>;
};

/**
 * Registered globally (APP_GUARD). Applies GLOBAL_RULE plus any @RateLimit
 * rules. A 'business' rule needs `req.user`, which only exists after
 * JwtAuthGuard, so those routes also list RateLimitGuard after it. Each rule
 * is counted at most once per request.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<LimitedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const routeRules =
      this.reflector.getAllAndOverride<RateLimitRule[] | undefined>(
        RATE_LIMIT_RULES,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    req.rateLimited ??= new Set();
    for (const rule of [GLOBAL_RULE, ...routeRules]) {
      if (req.rateLimited.has(rule.name)) continue;
      const subject = this.subject(rule, req);
      if (subject === null) continue;
      req.rateLimited.add(rule.name);

      const hit = await this.store.hit(
        `${rule.name}:${subject}`,
        rule.windowMs,
      );
      if (hit.count > rule.limit) {
        const retryAfter = Math.max(
          1,
          Math.ceil((hit.resetAt - Date.now()) / 1000),
        );
        res.setHeader('Retry-After', String(retryAfter));
        throw new HttpException(
          'Too many requests. Please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return true;
  }

  /** The counted identity, or null when it is not known yet. */
  private subject(rule: RateLimitRule, req: LimitedRequest): string | null {
    const ip = req.ip ?? 'unknown';
    if (rule.key === 'ip') return ip;
    if (rule.key === 'business') return req.user?.businessId ?? null;
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return `${ip}|${email}`;
  }
}
