import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { MemoryRateLimitStore } from '../rate-limit/rate-limit.store';
import {
  AI_RULE,
  AUTH_RULE,
  type RateLimitRule,
} from '../rate-limit/rate-limit.decorator';

function context(req: Record<string, unknown>, rules?: RateLimitRule[]) {
  const res = { setHeader: jest.fn() };
  const ctx = {
    getType: () => 'http',
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(rules),
  } as unknown as Reflector;
  return { ctx, res, reflector };
}

describe('RateLimitGuard', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  const attempt = (req: Record<string, unknown>, rules?: RateLimitRule[]) => {
    const { ctx, res, reflector } = context(req, rules);
    return {
      run: () => new RateLimitGuard(reflector, store).canActivate(ctx),
      res,
    };
  };

  it('allows requests within the global limit', async () => {
    await expect(attempt({ ip: '1.1.1.1' }).run()).resolves.toBe(true);
  });

  it('refuses the 6th sign-in for one ip+email with 429 and Retry-After', async () => {
    const req = () => ({ ip: '1.1.1.1', body: { email: 'A@x.com ' } });
    for (let i = 0; i < 5; i++) await attempt(req(), [AUTH_RULE]).run();

    const sixth = attempt(req(), [AUTH_RULE]);
    await expect(sixth.run()).rejects.toMatchObject({ status: 429 });
    expect(sixth.res.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.stringMatching(/^\d+$/),
    );
  });

  it('counts ip+email case-insensitively but separately per email', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt({ ip: '1.1.1.1', body: { email: 'a@x.com' } }, [
        AUTH_RULE,
      ]).run();
    }
    await expect(
      attempt({ ip: '1.1.1.1', body: { email: 'A@X.COM' } }, [AUTH_RULE]).run(),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      attempt({ ip: '1.1.1.1', body: { email: 'b@x.com' } }, [AUTH_RULE]).run(),
    ).resolves.toBe(true);
  });

  it('skips a business rule until the user is known, then applies it once', async () => {
    const req: Record<string, unknown> = { ip: '1.1.1.1' };
    await attempt(req, [AI_RULE]).run();
    const hitsBefore = (await store.hit('ai:b1', 60_000)).count;
    expect(hitsBefore).toBe(1);

    req.user = { businessId: 'b1' };
    await attempt(req, [AI_RULE]).run();
    await attempt(req, [AI_RULE]).run(); // same request: counted once
    expect((await store.hit('ai:b1', 60_000)).count).toBe(3);
  });

  it('ignores non-http contexts', async () => {
    const ctx = { getType: () => 'rpc' } as unknown as ExecutionContext;
    await expect(
      new RateLimitGuard({} as Reflector, store).canActivate(ctx),
    ).resolves.toBe(true);
  });
});
