import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersRepository } from './users.repository';
import { User } from '../entities/user.entity';
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
  let jwtService: {
    signAsync: jest.Mock<Promise<string>, [object, object]>;
    verify: jest.Mock;
  };
  let configService: { get: jest.Mock<string | undefined, [string]> };

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
    jwtService = {
      signAsync: jest.fn((_payload: object, _options: object) =>
        Promise.resolve('signed-token'),
      ),
      verify: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'secret';
        return undefined;
      }),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      jwtService as never,
      configService as never,
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
      expect(result.access_token).toBe('signed-token');
      expect(result.refresh_token).toBe('signed-token');
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

      const result = await service.login(dto);

      expect(result.access_token).toBe('signed-token');
      expect(result.user.id).toBe('u1');
      expect(usersRepository.save).toHaveBeenCalled();
      const savedArg = usersRepository.save.mock.calls[0][0];
      expect(savedArg.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('refreshToken', () => {
    it('throws UnauthorizedException for an invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.com' });
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.refreshToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns fresh tokens for a valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.com' });
      usersRepository.findById.mockResolvedValue(baseUser);

      const result = await service.refreshToken('valid-token');

      expect(result.access_token).toBe('signed-token');
      expect(result.user.id).toBe('u1');
    });
  });

  describe('logout', () => {
    it('returns a logout message', () => {
      expect(service.logout()).toEqual({
        message: 'Logged out successfully',
      });
    });
  });

  describe('generateTokens', () => {
    it('signs an access token and a refresh token', async () => {
      const tokens = await (
        service as unknown as {
          generateTokens: (u: User) => Promise<{
            access_token: string;
            refresh_token: string;
          }>;
        }
      ).generateTokens(baseUser);

      expect(tokens.access_token).toBe('signed-token');
      expect(tokens.refresh_token).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          sub: 'u1',
          role: 'owner',
          permissions: [...ALL_PERMISSIONS],
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sub: 'u1' }),
        expect.objectContaining({ expiresIn: '7d', secret: 'secret' }),
      );
    });

    it('uses the configured JWT_EXPIRES_IN when set', async () => {
      configService.get = jest.fn((key: string) =>
        key === 'JWT_EXPIRES_IN' ? '1m' : undefined,
      );

      await (
        service as unknown as {
          generateTokens: (u: User) => Promise<{
            access_token: string;
            refresh_token: string;
          }>;
        }
      ).generateTokens(baseUser);

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
          generateTokens: (u: User) => Promise<{
            access_token: string;
            refresh_token: string;
          }>;
        }
      ).generateTokens(staffUser);

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ staffRole: 'manager' }),
        expect.anything(),
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

    it('returns the full user shape including avatar and staffRole', async () => {
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
      });
    });
  });
});
