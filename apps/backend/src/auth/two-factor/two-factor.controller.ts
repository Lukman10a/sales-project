import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, JwtAuthGuard, ZodValidationPipe } from '../../common';
import type { CurrentUserPayload } from '../../common';
import {
  MFA_RULE,
  RateLimit,
} from '../../common/rate-limit/rate-limit.decorator';
import {
  DisableTwoFactorDtoSchema,
  TwoFactorCodeDtoSchema,
  TwoFactorRequirementDtoSchema,
} from '../dto/two-factor.dto';
import type {
  DisableTwoFactorDto,
  TwoFactorCodeDto,
  TwoFactorRequirementDto,
} from '../dto/two-factor.dto';
import type { ClientContext } from '../sessions.service';
import { TwoFactorService } from './two-factor.service';

const clientContext = (req: Request): ClientContext => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});

/**
 * Managing two-step verification for the signed-in user. The sign-in step
 * itself is POST /auth/2fa/verify on AuthController, which sets the cookies.
 */
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactor: TwoFactorService) {}

  /** GET /auth/2fa → { twoFactorEnabled, twoFactorRequired, ..., backupCodesRemaining } */
  @Get()
  status(@CurrentUser() user: CurrentUserPayload) {
    return this.twoFactor.status(user.id);
  }

  /** POST /auth/2fa/setup → { secret, otpauthUri } for the QR code. */
  @Post('setup')
  @HttpCode(200)
  setup(@CurrentUser() user: CurrentUserPayload) {
    return this.twoFactor.beginSetup(user.id);
  }

  /** POST /auth/2fa/enable { code } → { backupCodes } (shown once). */
  @Post('enable')
  @RateLimit(MFA_RULE)
  @HttpCode(200)
  enable(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(TwoFactorCodeDtoSchema)) body: TwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.twoFactor.enable(user.id, body.code, clientContext(req));
  }

  /** POST /auth/2fa/disable { password, code } */
  @Post('disable')
  @RateLimit(MFA_RULE)
  @HttpCode(200)
  disable(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(DisableTwoFactorDtoSchema))
    body: DisableTwoFactorDto,
    @Req() req: Request,
  ) {
    return this.twoFactor.disable(
      user.id,
      body.password,
      body.code,
      clientContext(req),
    );
  }

  /** POST /auth/2fa/backup-codes { code } → { backupCodes }; old ones stop working. */
  @Post('backup-codes')
  @RateLimit(MFA_RULE)
  @HttpCode(200)
  regenerateBackupCodes(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(TwoFactorCodeDtoSchema)) body: TwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.twoFactor.regenerateBackupCodes(
      user.id,
      body.code,
      clientContext(req),
    );
  }

  /** PUT /auth/2fa/requirement { required }: business setting, owner only. */
  @Put('requirement')
  setRequirement(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(TwoFactorRequirementDtoSchema))
    body: TwoFactorRequirementDto,
    @Req() req: Request,
  ) {
    return this.twoFactor.setRequirement(
      user,
      body.required,
      clientContext(req),
    );
  }
}
