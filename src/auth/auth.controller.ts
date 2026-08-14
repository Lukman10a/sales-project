import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, CurrentUser } from '../common';
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
  async register(@Body() registerDto: RegisterDto) {
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
  async login(@Body() loginDto: LoginDto) {
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
  async refresh(@Body() body: { refreshToken: string }) {
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
  async logout() {
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
    return user;
  }
}
