import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersRepository } from './users.repository';
import { User } from '../entities/user.entity';
import { TeamMember } from '../entities/team-member.entity';
import { ALL_PERMISSIONS } from '../common/constants/permissions';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
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
  } as unknown as User;

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn((_email: string) => Promise.resolve(null)),
      findById: jest.fn((_id: string) => Promise.resolve(null)),
      create: jest.fn((data: Partial<User>) => ({ id: 'u1', ...data }) as User),
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

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      jwtService as never,
      configService as never,
      teamMemberRepository as never,
      sessionsService as never,
    );
  });

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
        }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
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

    it('throws UnauthorizedException for an incorrect password', async () => {
      usersRepository.findByEmail.mockResolvedValue(baseUser);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns tokens and user for valid credentials', async () => {
      usersRepository.findByEmail.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const ctx = { userAgent: 'UA', ip: '1.2.3.4' };
      const result = await service.login({ ...dto, remember: true }, ctx);

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
      });
    });
  });
});
