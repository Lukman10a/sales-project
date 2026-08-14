import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  newSales?: boolean;

  @IsOptional()
  @IsBoolean()
  reports?: boolean;

  @IsOptional()
  @IsBoolean()
  teamActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  aiInsights?: boolean;
}

class AppearanceSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['12h', '24h'])
  timeFormat?: string;

  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AppearanceSettingsDto)
  appearanceSettings?: AppearanceSettingsDto;
}
