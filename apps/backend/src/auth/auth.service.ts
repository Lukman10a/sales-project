import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { User } from '../entities/user.entity';
import { UsersRepository } from './users.repository';
import { TeamMemberRepository } from './team-members.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SessionsService, type ClientContext } from './sessions.service';
import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from '../common/constants/permissions';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private teamMemberRepository: TeamMemberRepository,
    private sessionsService: SessionsService,
  ) {}

  async register(registerDto: RegisterDto, ctx: ClientContext = {}) {
    const { email, password, firstName, lastName, businessName } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      businessName,
      role: 'owner',
      status: 'active',
    });

    await this.usersRepository.save(user);

    // Owner accounts act as their own tenant
    user.businessId = user.id;
    await this.usersRepository.save(user);

    return {
      message: 'User registered successfully',
      user: await this.toUserResponse(user),
      session: await this.signIn(user, ctx, false),
    };
  }

  async login(loginDto: LoginDto, ctx: ClientContext = {}) {
    const { email, password, remember = false } = loginDto;

    // Find user
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.usersRepository.save(user);

    return {
      user: await this.toUserResponse(user),
      session: await this.signIn(user, ctx, remember),
    };
  }

  /** Rotates the refresh token (see SessionsService.rotate) and re-signs access. */
  async refresh(refreshToken: string, ctx: ClientContext = {}) {
    const { userId, issued } = await this.sessionsService.rotate(
      refreshToken,
      ctx,
    );
    const user = await this.usersRepository.findById(userId);
    if (!user || user.status === 'inactive') {
      await this.sessionsService.revoke(issued.familyId);
      throw new UnauthorizedException('Invalid refresh token');
    }
    return {
      user: await this.toUserResponse(user),
      session: {
        ...issued,
        accessToken: await this.signAccessToken(user, issued.familyId),
      },
    };
  }

  async me(userId: string) {
    const user = await this.findUserOrThrow(userId);

    return this.toUserResponse(user);
  }

  async logout(sessionId: string | undefined) {
    if (sessionId) await this.sessionsService.revoke(sessionId);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    const revoked = await this.sessionsService.revokeAll(userId);
    return { message: 'Logged out everywhere', revoked };
  }

  listSessions(userId: string, currentSessionId?: string) {
    return this.sessionsService.list(userId, currentSessionId);
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.sessionsService.revokeOne(userId, sessionId);
    return { message: 'Session revoked' };
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Effective permissions for the token and /auth/me payload. Owners always
   * hold every permission. Staff load their stored TeamMember permissions
   * (businessId + userId); when none are stored, the role's defaults apply.
   * Users with no TeamMember row (owner self-registration edge) keep an empty
   * permission set.
   */
  private async loadEffectivePermissions(user: User): Promise<string[]> {
    if (user.role === 'owner') return [...ALL_PERMISSIONS];

    const member = await this.teamMemberRepository.findByBusinessAndUser(
      user.businessId ?? user.id,
      user.id,
    );
    if (!member) return [];

    if (member.permissions.length > 0) return [...member.permissions];
    return ROLE_DEFAULT_PERMISSIONS[member.role] ?? [];
  }

  /** Starts a session family and signs the first access token for it. */
  private async signIn(user: User, ctx: ClientContext, persistent: boolean) {
    const issued = await this.sessionsService.start(
      { id: user.id, businessId: user.businessId ?? user.id },
      ctx,
      persistent,
    );
    return {
      ...issued,
      accessToken: await this.signAccessToken(user, issued.familyId),
    };
  }

  private async signAccessToken(user: User, sessionId: string) {
    const permissions = await this.loadEffectivePermissions(user);
    const payload: JwtPayload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
      businessName: user.businessName,
      businessId: user.businessId ?? user.id,
      staffRole: user.staffRole,
      permissions,
    };

    const expiresIn: JwtSignOptions['expiresIn'] =
      (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as JwtSignOptions['expiresIn'];

    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async toUserResponse(user: User) {
    const permissions = await this.loadEffectivePermissions(user);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      businessId: user.businessId ?? user.id,
      role: user.role,
      avatar: user.avatar,
      staffRole: user.staffRole,
      permissions,
    };
  }
}
