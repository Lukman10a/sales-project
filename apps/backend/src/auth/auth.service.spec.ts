import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersRepository } from './users.repository';
import { User } from '../entities/user.entity';
import { TeamMember } from '../entities/team-member.entity';
import { ALL_PERMISSIONS } from '../common/constants/permissions';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  getRounds: jest.fn(() => 12),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmail: jest.Mock<Promise<User | null>, [string]>;
    findById: jest.Mock<Promise<User | null>, [string]>;
    create: jest.Mock<User, [Partial<User>]>;
    save: jest.Mock<Promise<User>, [User]>;
  };
  let teamMemberRepository: {
    findByBusinessAndUser: jest.Mock<
      Promise<TeamMember | null>,
      [string, string]
    >;
  };
  let jwtService: {
    signAsync: jest.Mock<Promise<string>, [object, object]>;
    verify: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let twoFactorService: {
    isEnabled: jest.Mock<boolean, [User]>;
    check: jest.Mock;
    describe: jest.Mock;
  };
  const twoFactorOff = {
    twoFactorEnabled: false,
    twoFactorRequired: false,
    twoFactorSetupRequired: false,
  };
  let sessionsService: {
    start: jest.Mock;
    rotate: jest.Mock;
    revoke: jest.Mock;
    revokeAll: jest.Mock;
    list: jest.Mock;
    revokeOne: jest.Mock;
  };
  const issued = {
    refreshToken: 'opaque-rt',
    familyId: 'sid-1',
    persistent: false,
    expiresAt: new Date('2030-01-01T00:00:00Z'),
  };
  let configService: {
    get: jest.Mock<string | undefined, [string]>;
    getOrThrow: jest.Mock<string, [string]>;
  };

  const baseUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    password: 'hashed-password',
    firstName: 'Ada',
    lastName: 'Lovelace',
    businessName: 'LUXA',
    businessId: 'u1',
    role: 'owner',
    status: 'active',
    createdAt: new Date(),
    emailVerifiedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  } as unknown as User;
  /** A fresh copy: login mutates the user it loads. */
  const freshUser = (overrides: Partial<User> = {}) => ({
    ...baseUser,
    ...overrides,
  });
  let accountService: {
    sendVerificationInBackground: jest.Mock;
    accountLocked: jest.Mock;
  };

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn((_email: string) => Promise.resolve(null)),
      findById: jest.fn((_id: string) => Promise.resolve(null)),
      create: jest.fn(
        (data: Partial<User>) =>
          ({ id: 'u1', createdAt: new Date(), ...data }) as User,
      ),
      save: jest.fn((user: User) => Promise.resolve(user)),
    };
    teamMemberRepository = {
      findByBusinessAndUser: jest.fn((_businessId: string, _userId: string) =>
        Promise.resolve(null),
      ),
    };
    jwtService = {
      signAsync: jest.fn((_payload: object, _options: object) =>
        Promise.resolve('signed-token'),
      ),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
    };
    twoFactorService = {
      isEnabled: jest.fn((_user: User) => false),
      check: jest.fn(),
      describe: jest.fn().mockResolvedValue(twoFactorOff),
    };
    configService = {
      get: jest.fn((_key: string): string | undefined => undefined),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'secret';
        throw new Error(`missing ${key}`);
      }),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    sessionsService = {
      start: jest.fn().mockResolvedValue(issued),
      rotate: jest.fn().mockResolvedValue({ userId: 'u1', issued }),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAll: jest.fn().mockResolvedValue(2),
      list: jest.fn().mockResolvedValue([]),
      revokeOne: jest.fn().mockResolvedValue(undefined),
    };

    accountService = {
      sendVerificationInBackground: jest.fn(),
      accountLocked: jest.fn(),
    };
    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      jwtService as never,
      configService as never,
      teamMemberRepository as never,
      sessionsService as never,
      accountService as never,
      twoFactorService as never,
    );
  });

  /** Signs in with no 2FA step and narrows the result to the session form. */
  async function signedIn(...args: Parameters<AuthService['login']>) {
    const result = await service.login(...args);
    if (result.mfaRequired) throw new Error('unexpected 2FA challenge');
    return result;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'owner@luxa.com',
      password: 'Password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      businessName: 'LUXA',
    };

    it('throws BadRequestException when the email is already registered', async () => {
      usersRepository.findByEmail.mockResolvedValue(baseUser);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creates a user, assigns businessId, and returns tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const result = await service.register(dto);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          firstName: 'Ada',
          role: 'owner',
          status: 'active',
          requireTwoFactor: true,
        }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(accountService.sendVerificationInBackground).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', emailVerifiedAt: null }),
      );
      expect(result.user.emailVerified).toBe(false);
      expect(result.user.verifyBy).toEqual(expect.any(String));
      expect(result.message).toBe('User registered successfully');
      expect(result.user.businessId).toBe('u1');
      expect(result.session).toEqual({
        ...issued,
        accessToken: 'signed-token',
      });
      expect(sessionsService.start).toHaveBeenCalledWith(
        { id: 'u1', businessId: 'u1' },
        {},
        false,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', sid: 'sid-1' }),
        expect.anything(),
      );
    });
  });

  describe('login', () => {
    const dto = { email: 'owner@luxa.com', password: 'Password1' };

    it('throws UnauthorizedException for unknown email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('spends bcrypt time even for an unknown email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('counts a wrong password', async () => {
      const user = freshUser({ failedLoginAttempts: 2 });
      usersRepository.findByEmail.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(user.failedLoginAttempts).toBe(3);
      expect(usersRepository.save).toHaveBeenCalledWith(user);
      expect(accountService.accountLocked).not.toHaveBeenCalled();
    });

    it('locks the account on the 5th wrong password and reports it', async () => {
      const user = freshUser({ failedLoginAttempts: 4 });
      usersRepository.findByEmail.mockResolvedValue(user);
      const ctx = { ip: '9.9.9.9' };

      await expect(service.login(dto, ctx)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(user.lockedUntil).toBeInstanceOf(Date);
      expect(accountService.accountLocked).toHaveBeenCalledWith(user, ctx);
    });

    it('refuses a locked account even with the right password', async () => {
      const user = freshUser({
        lockedUntil: new Date(Date.now() + 60_000),
        password: 'real-hash',
      });
      usersRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalledWith(
        dto.password,
        'real-hash',
      );
      expect(sessionsService.start).not.toHaveBeenCalled();
    });

    it('rejects a deactivated account after the password check', async () => {
      usersRepository.findByEmail.mockResolvedValue(
        freshUser({ status: 'inactive' }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(
        'This account has been deactivated',
      );
    });

    it('rejects an owner who has not verified within 7 days', async () => {
      usersRepository.findByEmail.mockResolvedValue(
        freshUser({
          emailVerifiedAt: null,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60_000),
        }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lets an unverified owner in during the grace period', async () => {
      usersRepository.findByEmail.mockResolvedValue(
        freshUser({ emailVerifiedAt: null }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await signedIn(dto);
      expect(result.user.emailVerified).toBe(false);
    });

    it('re-hashes a password stored at an outdated cost', async () => {
      const user = freshUser();
      usersRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.getRounds as jest.Mock).mockReturnValueOnce(10);
      (bcrypt.hash as jest.Mock).mockResolvedValue('upgraded-hash');

      await service.login(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(user.password).toBe('upgraded-hash');
    });

    it('returns tokens and user for valid credentials and clears failures', async () => {
      const user = freshUser({ failedLoginAttempts: 3 });
      usersRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const ctx = { userAgent: 'UA', ip: '1.2.3.4' };
      const result = await signedIn({ ...dto, remember: true }, ctx);

      expect(result.session.accessToken).toBe('signed-token');
      expect(result.session.refreshToken).toBe('opaque-rt');
      expect(sessionsService.start).toHaveBeenCalledWith(
        { id: 'u1', businessId: 'u1' },
        ctx,
        true,
      );
      expect(result.user.id).toBe('u1');
      expect(usersRepository.save).toHaveBeenCalled();
      const savedArg = usersRepository.save.mock.calls[0][0];
      expect(savedArg.lastLogin).toBeInstanceOf(Date);
      expect(savedArg.failedLoginAttempts).toBe(0);
    });
  });

  describe('refresh', () => {
    it('propagates a rejected rotation', async () => {
      sessionsService.rotate.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );
      await expect(service.refresh('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('revokes the session when the user no longer exists', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionsService.revoke).toHaveBeenCalledWith('sid-1');
    });

    it('revokes the session of a deactivated user', async () => {
      usersRepository.findById.mockResolvedValue({
        ...baseUser,
        status: 'inactive',
      });

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionsService.revoke).toHaveBeenCalledWith('sid-1');
    });

    it('revokes the session of an owner whose verification is overdue', async () => {
      usersRepository.findById.mockResolvedValue(
        freshUser({
          emailVerifiedAt: null,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60_000),
        }),
      );
      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionsService.revoke).toHaveBeenCalledWith('sid-1');
    });

    it('returns the rotated session with a fresh access token', async () => {
      usersRepository.findById.mockResolvedValue(baseUser);

      const result = await service.refresh('valid-token', { ip: '1.1.1.1' });

      expect(sessionsService.rotate).toHaveBeenCalledWith('valid-token', {
        ip: '1.1.1.1',
      });
      expect(result.session).toEqual({
        ...issued,
        accessToken: 'signed-token',
      });
      expect(result.user.id).toBe('u1');
    });
  });

  describe('logout', () => {
    it('revokes the current session', async () => {
      await expect(service.logout('sid-1')).resolves.toEqual({
        message: 'Logged out successfully',
      });
      expect(sessionsService.revoke).toHaveBeenCalledWith('sid-1');
    });

    it('revokes every session on logout-all', async () => {
      await expect(service.logoutAll('u1')).resolves.toEqual({
        message: 'Logged out everywhere',
        revoked: 2,
      });
      expect(sessionsService.revokeAll).toHaveBeenCalledWith('u1');
    });

    it('lists and revokes devices through the sessions service', async () => {
      await service.listSessions('u1', 'sid-1');
      expect(sessionsService.list).toHaveBeenCalledWith('u1', 'sid-1');

      await service.revokeSession('u1', 'sid-2');
      expect(sessionsService.revokeOne).toHaveBeenCalledWith('u1', 'sid-2');
    });
  });

  describe('signAccessToken', () => {
    it('signs an access token bound to the session', async () => {
      const token = await (
        service as unknown as {
          signAccessToken: (u: User, sid: string) => Promise<string>;
        }
      ).signAccessToken(baseUser, 'sid-1');

      expect(token).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'u1',
          sid: 'sid-1',
          role: 'owner',
          permissions: [...ALL_PERMISSIONS],
        }),
        { expiresIn: '15m' },
      );
    });

    it('uses the configured JWT_EXPIRES_IN when set', async () => {
      configService.get = jest.fn((key: string) =>
        key === 'JWT_EXPIRES_IN' ? '1m' : undefined,
      );

      await (
        service as unknown as {
          signAccessToken: (u: User, sid: string) => Promise<string>;
        }
      ).signAccessToken(baseUser, 'sid-1');

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sub: 'u1' }),
        expect.objectContaining({ expiresIn: '1m' }),
      );
    });

    it('includes staffRole in the access token payload for staff users', async () => {
      const staffUser = {
        ...baseUser,
        role: 'apprentice',
        staffRole: 'manager',
      } as unknown as User;

      await (
        service as unknown as {
          signAccessToken: (u: User, sid: string) => Promise<string>;
        }
      ).signAccessToken(staffUser, 'sid-1');

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ staffRole: 'manager' }),
        expect.anything(),
      );
    });
  });

  describe('effective permissions', () => {
    const managerUser = {
      ...baseUser,
      role: 'manager',
      businessId: 'b1',
      staffRole: 'manager',
    } as unknown as User;

    const signAccessToken = () =>
      (
        service as unknown as {
          signAccessToken: (u: User, sid: string) => Promise<string>;
        }
      ).signAccessToken(managerUser, 'sid-1');

    it('loads real permissions from the TeamMember row into the token for a non-owner', async () => {
      teamMemberRepository.findByBusinessAndUser.mockResolvedValue({
        role: 'manager',
        permissions: ['record-sales', 'view-inventory'],
      } as unknown as TeamMember);

      await signAccessToken();

      expect(teamMemberRepository.findByBusinessAndUser).toHaveBeenCalledWith(
        'b1',
        'u1',
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          permissions: ['record-sales', 'view-inventory'],
        }),
        expect.anything(),
      );
    });

    it('falls back to role default permissions when the TeamMember permissions are empty', async () => {
      teamMemberRepository.findByBusinessAndUser.mockResolvedValue({
        role: 'manager',
        permissions: [],
      } as unknown as TeamMember);

      await signAccessToken();

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          permissions: [
            'view-products',
            'edit-products',
            'view-sales-history',
            'record-sales',
            'view-inventory',
            'edit-inventory',
            'assign-roles',
            'view-reports',
          ],
        }),
        expect.anything(),
      );
    });

    it('keeps empty permissions for staff with no TeamMember row', async () => {
      teamMemberRepository.findByBusinessAndUser.mockResolvedValue(null);

      await signAccessToken();

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ permissions: [] }),
        expect.anything(),
      );
    });

    it('never queries the TeamMember row for an owner', async () => {
      await (
        service as unknown as {
          signAccessToken: (u: User, sid: string) => Promise<unknown>;
        }
      ).signAccessToken(baseUser, 'sid-1');

      expect(teamMemberRepository.findByBusinessAndUser).not.toHaveBeenCalled();
    });

    it('includes the real permissions in the /auth/me response', async () => {
      teamMemberRepository.findByBusinessAndUser.mockResolvedValue({
        role: 'manager',
        permissions: ['view-sales-history'],
      } as unknown as TeamMember);
      usersRepository.findById.mockResolvedValue(managerUser);

      const result = await service.me('u1');

      expect(result).toEqual(
        expect.objectContaining({
          permissions: ['view-sales-history'],
        }),
      );
    });
  });

  describe('me', () => {
    it('throws UnauthorizedException when the user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.me('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns the full user shape including avatar, staffRole and permissions', async () => {
      const staffUser = {
        ...baseUser,
        role: 'apprentice',
        staffRole: 'manager',
        avatar: 'data:image/png;base64,abc',
      } as unknown as User;
      usersRepository.findById.mockResolvedValue(staffUser);

      const result = await service.me('u1');

      expect(result).toEqual({
        id: 'u1',
        email: 'owner@luxa.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        businessName: 'LUXA',
        businessId: 'u1',
        role: 'apprentice',
        avatar: 'data:image/png;base64,abc',
        staffRole: 'manager',
        permissions: [],
        emailVerified: true,
        verifyBy: null,
        ...twoFactorOff,
      });
    });
  });

  describe('two-step sign-in', () => {
    const dto = { email: 'owner@luxa.com', password: 'Password1' };
    const ctx = { userAgent: 'UA', ip: '1.2.3.4' };

    beforeEach(() => {
      twoFactorService.isEnabled.mockReturnValue(true);
    });

    it('returns a challenge instead of a session when 2FA is on', async () => {
      const user = freshUser({ failedLoginAttempts: 2 });
      usersRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('challenge-token');

      const result = await service.login({ ...dto, remember: true }, ctx);

      expect(result).toEqual({
        mfaRequired: true,
        challenge: 'challenge-token',
      });
      expect(sessionsService.start).not.toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'u1', typ: 'mfa', rem: true },
        { expiresIn: '5m', audience: 'luxa:mfa-challenge' },
      );
      // Failures are only cleared once the code is right.
      expect(user.failedLoginAttempts).toBe(2);
    });

    it('still refuses a wrong password before any 2FA step', async () => {
      usersRepository.findByEmail.mockResolvedValue(freshUser());
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('signs in with a valid code, keeping the trust-this-device choice', async () => {
      const user = freshUser({ failedLoginAttempts: 3 });
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        typ: 'mfa',
        rem: true,
      });
      usersRepository.findById.mockResolvedValue(user);
      twoFactorService.check.mockResolvedValue('totp');

      const result = await service.verifyTwoFactor('challenge', '123456', ctx);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('challenge', {
        audience: 'luxa:mfa-challenge',
      });
      expect(twoFactorService.check).toHaveBeenCalledWith(
        user,
        '123456',
        ctx,
        'sign-in',
      );
      expect(sessionsService.start).toHaveBeenCalledWith(
        { id: 'u1', businessId: 'u1' },
        ctx,
        true,
      );
      expect(result.session.accessToken).toBe('signed-token');
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lastLogin).toBeInstanceOf(Date);
    });

    it('counts a wrong code toward the lockout', async () => {
      const user = freshUser({ failedLoginAttempts: 4 });
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'u1',
        typ: 'mfa',
        rem: false,
      });
      usersRepository.findById.mockResolvedValue(user);
      twoFactorService.check.mockResolvedValue(null);

      await expect(
        service.verifyTwoFactor('challenge', '000000', ctx),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(user.lockedUntil).toBeInstanceOf(Date);
      expect(accountService.accountLocked).toHaveBeenCalledWith(user, ctx);
      expect(sessionsService.start).not.toHaveBeenCalled();
    });

    it('refuses a locked account without checking the code', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', typ: 'mfa' });
      usersRepository.findById.mockResolvedValue(
        freshUser({ lockedUntil: new Date(Date.now() + 60_000) }),
      );

      await expect(
        service.verifyTwoFactor('challenge', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(twoFactorService.check).not.toHaveBeenCalled();
    });

    it('refuses an expired or foreign challenge', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(
        service.verifyTwoFactor('challenge', '123456'),
      ).rejects.toThrow('Your sign-in timed out');

      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', sid: 'x' });
      await expect(
        service.verifyTwoFactor('access-token', '123456'),
      ).rejects.toThrow('Your sign-in timed out');
    });

    it('refuses an inactive account at the code step', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', typ: 'mfa' });
      usersRepository.findById.mockResolvedValue(
        freshUser({ status: 'inactive' }),
      );
      await expect(
        service.verifyTwoFactor('challenge', '123456'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
