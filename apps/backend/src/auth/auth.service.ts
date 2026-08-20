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
  ) {}

  async register(registerDto: RegisterDto) {
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

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      message: 'User registered successfully',
      user: await this.toUserResponse(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

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

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: await this.toUserResponse(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'default-refresh-secret';
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.findUserOrThrow(payload.sub);

      const tokens = await this.generateTokens(user);

      return {
        user: await this.toUserResponse(user),
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async me(userId: string) {
    const user = await this.findUserOrThrow(userId);

    return this.toUserResponse(user);
  }

  logout() {
    return { message: 'Logged out successfully' };
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

  private async generateTokens(user: User) {
    const permissions = await this.loadEffectivePermissions(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessName: user.businessName,
      businessId: user.businessId ?? user.id,
      staffRole: user.staffRole,
      permissions,
    };

    const accessExpiresIn: JwtSignOptions['expiresIn'] =
      (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as JwtSignOptions['expiresIn'];
    const refreshExpiresIn: JwtSignOptions['expiresIn'] =
      (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
        '7d') as JwtSignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiresIn,
    });

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default-refresh-secret';
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    return { access_token: accessToken, refresh_token: refreshToken };
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
