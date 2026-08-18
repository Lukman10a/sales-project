import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard, CurrentUser, ZodValidationPipe } from '../common';
import type { CurrentUserPayload } from '../common';
import { UpdateProfileDtoSchema } from './dto/update-profile.dto';
import { ChangePasswordDtoSchema } from './dto/change-password.dto';
import { UpdatePreferencesDtoSchema } from './dto/update-preferences.dto';
import { UpdateAvatarDtoSchema } from './dto/update-avatar.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { UpdateAvatarDto } from './dto/update-avatar.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  /**
   * Get current user profile
   * GET /profile
   * Requires: Bearer token
   */
  @Get()
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getProfile(user.id);
  }

  /**
   * Update current user profile
   * PATCH /profile
   * Requires: Bearer token
   */
  @Patch()
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdateProfileDtoSchema))
    updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  /**
   * Change user password
   * POST /profile/change-password
   * Requires: Bearer token
   */
  @Post('change-password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(ChangePasswordDtoSchema))
    changePasswordDto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.id, changePasswordDto);
  }

  /**
   * Update notification and appearance preferences
   * PATCH /profile/preferences
   * Requires: Bearer token
   */
  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdatePreferencesDtoSchema))
    updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.profileService.updatePreferences(user.id, updatePreferencesDto);
  }

  /**
   * Upload current user avatar
   * POST /profile/avatar
   * Requires: Bearer token
   */
  @Post('avatar')
  @HttpCode(200)
  updateAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdateAvatarDtoSchema))
    updateAvatarDto: UpdateAvatarDto,
  ) {
    return this.profileService.uploadAvatar(user.id, updateAvatarDto);
  }
}
