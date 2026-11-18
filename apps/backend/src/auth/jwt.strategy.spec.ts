import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtStrategy, fromAccessCookie } from './jwt.strategy';
import type { SessionsService } from './sessions.service';
import type { Principal, PrincipalService } from './principal.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let isActive: jest.Mock<Promise<boolean>, [string]>;
  let resolve: jest.Mock<Promise<Principal | null>, [string, string]>;
  const env: Record<string, string> = {
    JWT_SECRET: 'test-secret',
    NODE_ENV: 'test',
  };
  const getOrThrow = jest.fn((key: string) => env[key]);
  const configService = {
    get: jest.fn((key: string) => env[key]),
    getOrThrow,
  } as unknown as ConfigService;

  const payload = { sub: 'u2', sid: 'sid-1', bid: 'b1' };
  const cashier: Principal = {
    id: 'u2',
    email: 'kelechi@shop.ng',
    role: 'cashier',
    businessId: 'b1',
    businessName: 'Shop',
    permissions: ['sales.record'],
    maxDiscountPercent: 0,
  };

  beforeEach(() => {
    isActive = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    resolve = jest
      .fn<Promise<Principal | null>, [string, string]>()
      .mockResolvedValue(cashier);
    strategy = new JwtStrategy(
      configService,
      { isActive } as unknown as SessionsService,
      { resolve } as unknown as PrincipalService,
    );
  });

  it('reads the JWT secret from config', () => {
    expect(getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('extracts the access token from the __Host- cookie', () => {
    const req = {
      headers: { cookie: 'other=1; __Host-luxa_at=a.b.c' },
    } as unknown as Request;
    expect(fromAccessCookie(req)).toBe('a.b.c');
    expect(fromAccessCookie({ headers: {} } as Request)).toBeNull();
  });

  it('resolves current permissions from the database, not the token', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual({
      ...cashier,
      sessionId: 'sid-1',
    });
    expect(isActive).toHaveBeenCalledWith('sid-1');
    expect(resolve).toHaveBeenCalledWith('u2', 'b1');
  });

  it('rejects a member who lost access to the business', async () => {
    resolve.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toThrow('Access revoked');
  });

  it('rejects a token whose session was revoked', async () => {
    isActive.mockResolvedValue(false);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    ['session id', { ...payload, sid: '' }],
    ['business id', { ...payload, bid: '' }],
  ])('rejects a legacy token without a %s', async (_label, legacy) => {
    await expect(strategy.validate(legacy)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
