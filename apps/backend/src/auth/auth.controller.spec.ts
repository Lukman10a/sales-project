import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Record<
    | 'register'
    | 'login'
    | 'refresh'
    | 'logout'
    | 'logoutAll'
    | 'listSessions'
    | 'revokeSession'
    | 'me',
    jest.Mock
  >;

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'u1',
    permissions: ['view-products'],
    sessionId: 'sid-1',
  };

  const session = {
    accessToken: 'jwt',
    refreshToken: 'rt',
    persistent: false,
    familyId: 'sid-1',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
  };

  const req = (cookie?: string) =>
    ({
      headers: { 'user-agent': 'UA', ...(cookie ? { cookie } : {}) },
      ip: '1.2.3.4',
    }) as unknown as Request;

  const res = () => {
    const r = { cookie: jest.fn(), clearCookie: jest.fn() };
    return Object.assign(r, { asRes: r as unknown as Response });
  };

  const cookieNames = (r: ReturnType<typeof res>) =>
    r.cookie.mock.calls.map(([name]) => name as string);

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      listSessions: jest.fn(),
      revokeSession: jest.fn(),
      me: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => (k === 'JWT_EXPIRES_IN' ? '15m' : undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('registers, sets session cookies and keeps tokens out of the body', async () => {
    const dto = {
      email: 'owner@luxa.com',
      password: 'Password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      businessName: 'LUXA',
    };
    authService.register.mockResolvedValue({
      message: 'ok',
      user: { id: 'u1' },
      session,
    });
    const r = res();

    await expect(controller.register(dto, req(), r.asRes)).resolves.toEqual({
      message: 'ok',
      user: { id: 'u1' },
    });
    expect(authService.register).toHaveBeenCalledWith(dto, {
      userAgent: 'UA',
      ip: '1.2.3.4',
    });
    expect(cookieNames(r)).toEqual(['__Host-luxa_at', 'luxa_rt', 'luxa_csrf']);
  });

  it('logs in and sets session cookies', async () => {
    const dto = { email: 'owner@luxa.com', password: 'Password1' };
    authService.login.mockResolvedValue({ user: { id: 'u1' }, session });
    const r = res();

    await expect(controller.login(dto, req(), r.asRes)).resolves.toEqual({
      user: { id: 'u1' },
    });
    expect(r.cookie).toHaveBeenCalledWith(
      '__Host-luxa_at',
      'jwt',
      expect.objectContaining({ httpOnly: true, maxAge: 900_000 }),
    );
  });

  it('refreshes from the refresh cookie', async () => {
    authService.refresh.mockResolvedValue({ user: { id: 'u1' }, session });
    const r = res();

    await expect(
      controller.refresh(req('luxa_rt=rt-1'), r.asRes),
    ).resolves.toEqual({
      user: { id: 'u1' },
    });
    expect(authService.refresh).toHaveBeenCalledWith('rt-1', {
      userAgent: 'UA',
      ip: '1.2.3.4',
    });
    expect(cookieNames(r)).toContain('luxa_rt');
  });

  it('rejects a refresh without a refresh cookie', async () => {
    await expect(controller.refresh(req(), res().asRes)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('clears cookies when the refresh is rejected', async () => {
    authService.refresh.mockRejectedValue(new UnauthorizedException());
    const r = res();

    await expect(
      controller.refresh(req('luxa_rt=old'), r.asRes),
    ).rejects.toThrow();
    expect(r.clearCookie).toHaveBeenCalledTimes(3);
  });

  it('logs out the current session and clears cookies', async () => {
    authService.logout.mockResolvedValue({
      message: 'Logged out successfully',
    });
    const r = res();

    await expect(controller.logout(currentUser, r.asRes)).resolves.toEqual({
      message: 'Logged out successfully',
    });
    expect(authService.logout).toHaveBeenCalledWith('sid-1');
    expect(r.clearCookie).toHaveBeenCalledTimes(3);
  });

  it('logs out everywhere', async () => {
    authService.logoutAll.mockResolvedValue({ revoked: 2 });
    const r = res();

    await controller.logoutAll(currentUser, r.asRes);
    expect(authService.logoutAll).toHaveBeenCalledWith('u1');
    expect(r.clearCookie).toHaveBeenCalled();
  });

  it('lists and revokes sessions for the current user', async () => {
    authService.listSessions.mockResolvedValue([]);
    authService.revokeSession.mockResolvedValue({ message: 'Session revoked' });

    await controller.sessions(currentUser);
    expect(authService.listSessions).toHaveBeenCalledWith('u1', 'sid-1');

    await controller.revokeSession(currentUser, 'sid-2');
    expect(authService.revokeSession).toHaveBeenCalledWith('u1', 'sid-2');
  });

  it('returns the full current user via the service', async () => {
    authService.me.mockResolvedValue({ ...currentUser, firstName: 'Ada' });

    await expect(controller.getCurrentUser(currentUser)).resolves.toEqual({
      ...currentUser,
      firstName: 'Ada',
    });
    expect(authService.me).toHaveBeenCalledWith('u1');
  });
});
