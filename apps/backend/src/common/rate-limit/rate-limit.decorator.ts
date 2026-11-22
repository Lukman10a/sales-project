import { SetMetadata } from '@nestjs/common';

/**
 * What a rule counts by:
 * - ip:       the client IP (`req.ip`, honours `trust proxy`)
 * - ip+email: client IP plus the lowercased `email` in the body, so one
 *             attacker cannot exhaust another user's sign-in budget
 * - business: the authenticated tenant (rule applies after JwtAuthGuard)
 */
export type RateLimitKey = 'ip' | 'ip+email' | 'business';

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
  key: RateLimitKey;
}

export const RATE_LIMIT_RULES = 'rateLimitRules';
const MINUTE = 60_000;

/** Applied to every request by the global RateLimitGuard. */
export const GLOBAL_RULE: RateLimitRule = {
  name: 'global',
  limit: 300,
  windowMs: MINUTE,
  key: 'ip',
};

export const AUTH_RULE: RateLimitRule = {
  name: 'auth',
  limit: 5,
  windowMs: MINUTE,
  key: 'ip+email',
};

/**
 * Two-step codes, per IP. Guessing is also capped per account by the
 * sign-in lockout.
 */
export const MFA_RULE: RateLimitRule = {
  name: 'mfa',
  limit: 10,
  windowMs: MINUTE,
  key: 'ip',
};

/** AI generation per business. Becomes per-plan with billing. */
export const AI_RULE: RateLimitRule = {
  name: 'ai',
  limit: 20,
  windowMs: MINUTE,
  key: 'business',
};

export const RateLimit = (...rules: RateLimitRule[]) =>
  SetMetadata(RATE_LIMIT_RULES, rules);
