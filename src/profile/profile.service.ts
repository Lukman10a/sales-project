import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../auth/users.repository';
import { UserProfileRepository } from './user-profiles.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

@Injectable()
export class ProfileService {
  constructor(
    private usersRepository: UsersRepository,
    private profilesRepository: UserProfileRepository,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create profile
    let profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      profile = this.profilesRepository.create({
        userId,
        company: user.businessName,
      });
      await this.profilesRepository.save(profile);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role,
        avatar: user.avatar,
      },
      profile: {
        phone: profile.phone,
        company: profile.company,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        bio: profile.bio,
      },
      preferences: {
        notificationPreferences: profile.notificationPreferences,
        appearanceSettings: profile.appearanceSettings,
      },
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user fields (firstName, lastName)
    if (updateProfileDto.firstName) user.firstName = updateProfileDto.firstName;
    if (updateProfileDto.lastName) user.lastName = updateProfileDto.lastName;
    await this.usersRepository.save(user);

    // Get or create profile
    let profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      profile = this.profilesRepository.create({ userId });
    }

    // Update profile fields
    const profileFields = [
      'phone',
      'company',
      'address',
      'city',
      'country',
      'bio',
    ] as const;

    for (const field of profileFields) {
      const value = updateProfileDto[field];
      if (value !== undefined) {
        profile[field] = value;
      }
    }

    await this.profilesRepository.save(profile);

    return this.getProfile(userId);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Ensure new password is different
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash and save new password
    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async uploadAvatar(userId: string, updateAvatarDto: UpdateAvatarDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.avatar = updateAvatarDto.dataUrl;
    await this.usersRepository.save(user);

    return { avatar: user.avatar };
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ) {
    let profile = await this.profilesRepository.findByUserId(userId);

    if (!profile) {
      profile = this.profilesRepository.create({ userId });
      await this.profilesRepository.save(profile);
    }

    // Merge notification preferences
    if (updatePreferencesDto.notificationPreferences) {
      profile.notificationPreferences = {
        ...profile.notificationPreferences,
        ...updatePreferencesDto.notificationPreferences,
      } as typeof profile.notificationPreferences;
    }

    // Merge appearance settings
    if (updatePreferencesDto.appearanceSettings) {
      profile.appearanceSettings = {
        ...profile.appearanceSettings,
        ...updatePreferencesDto.appearanceSettings,
      } as typeof profile.appearanceSettings;
    }

    await this.profilesRepository.save(profile);

    return {
      notificationPreferences: profile.notificationPreferences,
      appearanceSettings: profile.appearanceSettings,
      message: 'Preferences updated successfully',
    };
  }
}
