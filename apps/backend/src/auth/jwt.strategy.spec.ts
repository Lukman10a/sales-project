import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtStrategy, fromAccessCookie } from './jwt.strategy';
import type { SessionsService } from './sessions.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let isActive: jest.Mock<Promise<boolean>, [string]>;
  const env: Record<string, string> = {
    JWT_SECRET: 'test-secret',
    NODE_ENV: 'test',
  };
  const getOrThrow = jest.fn((key: string) => env[key]);
  const configService = {
    get: jest.fn((key: string) => env[key]),
    getOrThrow,
  } as unknown as ConfigService;

  const base = {
    sub: 'u1',
    sid: 'sid-1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'u1',
  };

  beforeEach(() => {
    isActive = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    strategy = new JwtStrategy(configService, {
      isActive,
    } as unknown as SessionsService);
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

  it('maps the payload to the current-user shape, including the session', async () => {
    await expect(
      strategy.validate({ ...base, permissions: ['view-products'] }),
    ).resolves.toEqual({
      id: 'u1',
      email: 'owner@luxa.com',
      role: 'owner',
      businessName: 'LUXA',
      businessId: 'u1',
      permissions: ['view-products'],
      sessionId: 'sid-1',
    });
    expect(isActive).toHaveBeenCalledWith('sid-1');
  });

  it('maps staffRole through', async () => {
    const result = await strategy.validate({ ...base, staffRole: 'manager' });
    expect(result.staffRole).toBe('manager');
  });

  it('rejects a token whose session was revoked', async () => {
    isActive.mockResolvedValue(false);
    await expect(strategy.validate(base)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a legacy token without a session id', async () => {
    await expect(
      strategy.validate({ ...base, sid: undefined as unknown as string }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(isActive).not.toHaveBeenCalled();
  });
});
