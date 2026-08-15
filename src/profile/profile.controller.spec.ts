import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../common';

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
    updatePreferences: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'u1',
  };

  beforeEach(async () => {
    profileService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      updatePreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: profileService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ProfileController);
  });

  it('delegates getProfile to the service with the current user id', async () => {
    profileService.getProfile.mockResolvedValue({ user: currentUser });

    await expect(controller.getProfile(currentUser)).resolves.toEqual({
      user: currentUser,
    });
    expect(profileService.getProfile).toHaveBeenCalledWith('u1');
  });

  it('delegates updateProfile to the service', async () => {
    const dto = { firstName: 'Grace' };
    profileService.updateProfile.mockResolvedValue({ ok: true });

    await expect(controller.updateProfile(currentUser, dto)).resolves.toEqual({
      ok: true,
    });
    expect(profileService.updateProfile).toHaveBeenCalledWith('u1', dto);
  });

  it('delegates changePassword to the service', async () => {
    const dto = { currentPassword: 'old', newPassword: 'NewPassword2' };
    profileService.changePassword.mockResolvedValue({ message: 'ok' });

    await expect(controller.changePassword(currentUser, dto)).resolves.toEqual({
      message: 'ok',
    });
    expect(profileService.changePassword).toHaveBeenCalledWith('u1', dto);
  });

  it('delegates updatePreferences to the service', async () => {
    const dto = { appearanceSettings: { theme: 'dark' as const } };
    profileService.updatePreferences.mockResolvedValue({ message: 'ok' });

    await expect(
      controller.updatePreferences(currentUser, dto),
    ).resolves.toEqual({ message: 'ok' });
    expect(profileService.updatePreferences).toHaveBeenCalledWith('u1', dto);
  });
});
