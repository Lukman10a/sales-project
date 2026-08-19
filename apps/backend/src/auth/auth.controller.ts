import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDtoSchema } from './dto/register.dto';
import { LoginDtoSchema } from './dto/login.dto';
import { RefreshTokenDtoSchema } from './dto/refresh-token.dto';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard, CurrentUser, ZodValidationPipe } from '../common';
import type { CurrentUserPayload } from '../common';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new business account
   * POST /auth/register
   *
   * Response: 201 Created
   * {
   *   message: string,
   *   user: { id, email, firstName, lastName, businessName, role },
   *   access_token: string,
   *   refresh_token: string
   * }
   */
  @Post('register')
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterDtoSchema)) registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  /**
   * Login with email and password
   * POST /auth/login
   *
   * Response: 200 OK
   * {
   *   user: { id, email, firstName, lastName, businessName, role },
   *   access_token: string,
   *   refresh_token: string
   * }
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(LoginDtoSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Get new access token using refresh token
   * POST /auth/refresh
   *
   * Response: 200 OK
   * {
   *   user: { id, email, firstName, lastName, businessName, role },
   *   access_token: string,
   *   refresh_token: string
   * }
   */
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(RefreshTokenDtoSchema))
    body: RefreshTokenDto,
  ) {
    return this.authService.refreshToken(body.refreshToken);
  }

  /**
   * Logout (invalidate tokens)
   * POST /auth/logout
   * Requires: Bearer token
   *
   * Response: 200 OK
   * { message: "Logged out successfully" }
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  logout() {
    return this.authService.logout();
  }

  /**
   * Get current user (test endpoint)
   * GET /auth/me
   * Requires: Bearer token
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.me(user.id);
  }
}
