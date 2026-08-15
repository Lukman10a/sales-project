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
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  /**
   * Get current user profile
   * GET /api/profile
   * Requires: Bearer token
   */
  @Get()
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getProfile(user.id);
  }

  /**
   * Update current user profile
   * PATCH /api/profile
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
   * POST /api/profile/change-password
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
   * PATCH /api/profile/preferences
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
}
