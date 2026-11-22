import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDtoSchema } from './dto/register.dto';
import { LoginDtoSchema } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, CurrentUser, ZodValidationPipe } from '../common';
import type { CurrentUserPayload } from '../common';
import { REFRESH_COOKIE, parseCookies } from '../common/http/cookies';
import {
  clearSessionCookies,
  durationMs,
  writeSessionCookies,
  type CookieSettings,
  type SessionCookies,
} from './auth-cookies';
import type { ClientContext } from './sessions.service';
import { AccountService } from './account.service';
import {
  EmailDtoSchema,
  ResetPasswordDtoSchema,
  TokenDtoSchema,
} from './dto/account.dto';
import type { EmailDto, ResetPasswordDto, TokenDto } from './dto/account.dto';
import {
  AUTH_RULE,
  MFA_RULE,
  RateLimit,
} from '../common/rate-limit/rate-limit.decorator';
import { VerifyTwoFactorDtoSchema } from './dto/two-factor.dto';
import type { VerifyTwoFactorDto } from './dto/two-factor.dto';

const clientContext = (req: Request): ClientContext => ({
  userAgent: req.headers['user-agent'],
  ip: req.ip,
});

/**
 * Sessions live in httpOnly cookies (see auth-cookies.ts). No token is ever
 * returned in a response body, so none is reachable from page scripts.
 */
@Controller('auth')
export class AuthController {
  private readonly cookies: CookieSettings;

  constructor(
    private authService: AuthService,
    private accountService: AccountService,
    config: ConfigService,
  ) {
    this.cookies = {
      domain: config.get<string>('COOKIE_DOMAIN'),
      accessMaxAgeMs: durationMs(
        config.get<string>('JWT_EXPIRES_IN'),
        15 * 60_000,
      ),
    };
  }

  /** POST /auth/register → 201 { message, user } + session cookies */
  @Post('register')
  @RateLimit(AUTH_RULE)
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterDtoSchema)) registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, ...body } = await this.authService.register(
      registerDto,
      clientContext(req),
    );
    this.setSession(res, session);
    return body;
  }

  /**
   * POST /auth/login → 200 { user } + session cookies, or, when 2FA is on,
   * 200 { mfaRequired: true, challenge } and no cookies.
   */
  @Post('login')
  @RateLimit(AUTH_RULE)
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginDtoSchema)) loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, clientContext(req));
    // 2FA on: no cookies until POST /auth/2fa/verify succeeds.
    if (result.mfaRequired) return result;
    const { session, ...body } = result;
    this.setSession(res, session);
    return body;
  }

  /**
   * POST /auth/2fa/verify { challenge, code } → 200 { user } + session
   * cookies. `code` is a 6-digit authenticator code or a backup code.
   */
  @Post('2fa/verify')
  @RateLimit(MFA_RULE)
  @HttpCode(200)
  async verifyTwoFactor(
    @Body(new ZodValidationPipe(VerifyTwoFactorDtoSchema))
    body: VerifyTwoFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, ...rest } = await this.authService.verifyTwoFactor(
      body.challenge,
      body.code,
      clientContext(req),
    );
    this.setSession(res, session);
    return rest;
  }

  /**
   * POST /auth/refresh: rotates the refresh cookie and re-issues the access
   * cookie. A replayed refresh token revokes its whole session family.
   */
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = parseCookies(req.headers.cookie)[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('No session');
    try {
      const { session, ...body } = await this.authService.refresh(
        token,
        clientContext(req),
      );
      this.setSession(res, session);
      return body;
    } catch (err) {
      clearSessionCookies(res, this.cookies);
      throw err;
    }
  }

  /** POST /auth/logout: revokes this device's session. */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user.sessionId);
    clearSessionCookies(res, this.cookies);
    return result;
  }

  /** POST /auth/logout-all: revokes every session of the user. */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logoutAll(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(user);
    clearSessionCookies(res, this.cookies);
    return result;
  }

  /** GET /auth/sessions: the signed-in devices. */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  sessions(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.listSessions(user.id, user.sessionId);
  }

  /** DELETE /auth/sessions/:id: signs one device out. */
  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  revokeSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.authService.revokeSession(user, id);
  }

  /** POST /auth/verify-email { token }: confirms the address. */
  @Post('verify-email')
  @RateLimit(AUTH_RULE)
  @HttpCode(200)
  verifyEmail(@Body(new ZodValidationPipe(TokenDtoSchema)) body: TokenDto) {
    return this.accountService.verifyEmail(body.token);
  }

  /** POST /auth/verify-email/resend { email } → 202, whether or not it exists. */
  @Post('verify-email/resend')
  @RateLimit(AUTH_RULE)
  @HttpCode(202)
  resendVerification(
    @Body(new ZodValidationPipe(EmailDtoSchema)) body: EmailDto,
  ) {
    return this.accountService.resendVerification(body.email);
  }

  /** POST /auth/forgot-password { email } → 202, whether or not it exists. */
  @Post('forgot-password')
  @RateLimit(AUTH_RULE)
  @HttpCode(202)
  forgotPassword(@Body(new ZodValidationPipe(EmailDtoSchema)) body: EmailDto) {
    return this.accountService.forgotPassword(body.email);
  }

  /** POST /auth/reset-password { token, password }: ends every session. */
  @Post('reset-password')
  @RateLimit(AUTH_RULE)
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordDtoSchema))
    body: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.accountService.resetPassword(
      body.token,
      body.password,
    );
    clearSessionCookies(res, this.cookies);
    return result;
  }

  /** GET /auth/me */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.me(user.id);
  }

  private setSession(res: Response, session: SessionCookies) {
    writeSessionCookies(res, session, this.cookies);
  }
}
