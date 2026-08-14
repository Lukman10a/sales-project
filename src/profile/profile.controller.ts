import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  /**
   * Get current user profile
   * GET /api/profile
   * Requires: Bearer token
   */
  @Get()
  getProfile(@Req() req) {
    return this.profileService.getProfile(req.user.id);
  }

  /**
   * Update current user profile
   * PATCH /api/profile
   * Requires: Bearer token
   */
  @Patch()
  updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, updateProfileDto);
  }

  /**
   * Change user password
   * POST /api/profile/change-password
   * Requires: Bearer token
   */
  @Post('change-password')
  @HttpCode(200)
  changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.profileService.changePassword(req.user.id, changePasswordDto);
  }

  /**
   * Update notification and appearance preferences
   * PATCH /api/profile/preferences
   * Requires: Bearer token
   */
  @Patch('preferences')
  updatePreferences(
    @Req() req,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.profileService.updatePreferences(
      req.user.id,
      updatePreferencesDto,
    );
  }
}
