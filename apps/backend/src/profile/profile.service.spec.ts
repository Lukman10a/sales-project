/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ProfileService } from './profile.service';
import { UsersRepository } from '../auth/users.repository';
import { UserProfileRepository } from './user-profiles.repository';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('ProfileService', () => {
  let service: ProfileService;
  let usersRepository: {
    findById: jest.Mock<Promise<User | null>, [string]>;
    save: jest.Mock<Promise<User>, [User]>;
  };
  let profilesRepository: {
    findByUserId: jest.Mock<Promise<UserProfile | null>, [string]>;
    create: jest.Mock<UserProfile, [Partial<UserProfile>]>;
    save: jest.Mock<Promise<UserProfile>, [UserProfile]>;
  };

  const user = {
    id: 'u1',
    email: 'owner@luxa.com',
    password: 'hashed-password',
    firstName: 'Ada',
    lastName: 'Lovelace',
    businessName: 'LUXA',
    role: 'owner',
    avatar: null,
  } as unknown as User;

  const profile = {
    id: 'p1',
    userId: 'u1',
    phone: '+234',
    company: 'LUXA',
    address: 'Lagos',
    city: 'Lagos',
    country: 'NG',
    bio: 'Builder',
    notificationPreferences: {
      email: true,
      push: true,
      lowStock: true,
      newSales: true,
      reports: true,
      teamActivity: true,
      aiInsights: true,
    },
    appearanceSettings: {
      theme: 'light',
      language: 'en',
      currency: 'NGN',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      compactMode: false,
    },
  } as unknown as UserProfile;

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn((_id: string) => Promise.resolve(null)),
      save: jest.fn((u: User) => Promise.resolve(u)),
    };
    profilesRepository = {
      findByUserId: jest.fn((_userId: string) => Promise.resolve(null)),
      create: jest.fn(
        (data: Partial<UserProfile>) => ({ id: 'p1', ...data }) as UserProfile,
      ),
      save: jest.fn((p: UserProfile) => Promise.resolve(p)),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    service = new ProfileService(
      usersRepository as unknown as UsersRepository,
      profilesRepository as unknown as UserProfileRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('throws NotFoundException when the user is missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates a profile when one does not exist yet', async () => {
      usersRepository.findById.mockResolvedValue(user);
      profilesRepository.findByUserId.mockResolvedValue(null);

      const result = await service.getProfile('u1');

      expect(profilesRepository.create).toHaveBeenCalledWith({
        userId: 'u1',
        company: 'LUXA',
      });
      expect(profilesRepository.save).toHaveBeenCalled();
      expect(result.profile.company).toBe('LUXA');
    });

    it('returns the existing profile', async () => {
      usersRepository.findById.mockResolvedValue(user);
      profilesRepository.findByUserId.mockResolvedValue(profile);

      const result = await service.getProfile('u1');

      expect(profilesRepository.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe('u1');
      expect(result.profile.phone).toBe('+234');
      expect(result.preferences.appearanceSettings.theme).toBe('light');
    });
  });

  describe('updateProfile', () => {
    it('updates user and profile fields', async () => {
      usersRepository.findById.mockResolvedValue(user);
      profilesRepository.findByUserId.mockResolvedValue(profile);

      const result = await service.updateProfile('u1', {
        firstName: 'Grace',
        phone: '+234-999',
        city: 'Abuja',
      });

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Grace' }),
      );
      expect(profilesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+234-999', city: 'Abuja' }),
      );
      expect(result.user.firstName).toBe('Grace');
    });
  });

  describe('changePassword', () => {
    const dto = { currentPassword: 'Password1', newPassword: 'NewPassword2' };

    it('throws NotFoundException when the user is missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the current password is wrong', async () => {
      usersRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword('u1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the new password matches the current', async () => {
      usersRepository.findById.mockResolvedValue(user);

      await expect(
        service.changePassword('u1', {
          currentPassword: 'Password1',
          newPassword: 'Password1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hashes and saves the new password', async () => {
      usersRepository.findById.mockResolvedValue(user);

      const result = await service.changePassword('u1', dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword2', 10);
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-hash' }),
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });

  describe('uploadAvatar', () => {
    const dto = {
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    };

    it('throws NotFoundException when the user is missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.uploadAvatar('missing', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates the user avatar and returns it', async () => {
      usersRepository.findById.mockResolvedValue(user);

      const result = await service.uploadAvatar('u1', dto);

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ avatar: dto.dataUrl }),
      );
      expect(result).toEqual({ avatar: dto.dataUrl });
    });
  });

  describe('updatePreferences', () => {
    it('creates a profile when missing and merges preferences', async () => {
      profilesRepository.findByUserId.mockResolvedValue(null);

      const result = await service.updatePreferences('u1', {
        notificationPreferences: { email: false },
        appearanceSettings: { theme: 'dark' },
      });

      expect(profilesRepository.create).toHaveBeenCalledWith({ userId: 'u1' });
      expect(result.notificationPreferences.email).toBe(false);
      expect(result.appearanceSettings.theme).toBe('dark');
      expect(result.message).toBe('Preferences updated successfully');
    });

    it('merges into the existing profile preferences', async () => {
      profilesRepository.findByUserId.mockResolvedValue(profile);

      const result = await service.updatePreferences('u1', {
        appearanceSettings: { theme: 'dark', compactMode: true },
      });

      expect(profilesRepository.create).not.toHaveBeenCalled();
      expect(result.appearanceSettings).toEqual(
        expect.objectContaining({ theme: 'dark', compactMode: true }),
      );
    });

    it('merges dashboardSettings into the existing profile', async () => {
      const profileWithDashboard = {
        ...profile,
        dashboardSettings: {
          layout: 'default',
          showWelcomeMessage: true,
          showTips: true,
          autoRefresh: true,
          refreshInterval: '1m',
          quickActions: [],
        },
      } as unknown as UserProfile;
      profilesRepository.findByUserId.mockResolvedValue(profileWithDashboard);

      const result = await service.updatePreferences('u1', {
        dashboardSettings: { showTips: false },
      });

      expect(profilesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          dashboardSettings: expect.objectContaining({
            showTips: false,
            layout: 'default',
          }),
        }),
      );

      expect(result.dashboardSettings.showTips).toBe(false);

      expect(result.dashboardSettings.layout).toBe('default');
    });

    it('creates dashboardSettings when profile is missing', async () => {
      profilesRepository.findByUserId.mockResolvedValue(null);

      const result = await service.updatePreferences('u1', {
        dashboardSettings: { layout: 'compact', refreshInterval: '5m' },
      });

      expect(profilesRepository.create).toHaveBeenCalledWith({ userId: 'u1' });

      expect(result.dashboardSettings.layout).toBe('compact');

      expect(result.dashboardSettings.refreshInterval).toBe('5m');
    });
  });

  describe('getProfile dashboardSettings', () => {
    it('returns dashboardSettings with defaults', async () => {
      const profileWithDashboard = {
        ...profile,
        dashboardSettings: {
          layout: 'default',
          showWelcomeMessage: true,
          showTips: true,
          autoRefresh: true,
          refreshInterval: '1m',
          quickActions: [],
        },
      } as unknown as UserProfile;
      usersRepository.findById.mockResolvedValue(user);
      profilesRepository.findByUserId.mockResolvedValue(profileWithDashboard);

      const result = await service.getProfile('u1');

      expect(result.preferences.dashboardSettings).toEqual(
        expect.objectContaining({ layout: 'default', showTips: true }),
      );
    });
  });
});
