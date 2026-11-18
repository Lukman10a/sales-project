import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { User } from '../entities/user.entity';
import { UsersRepository } from './users.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SessionsService, type ClientContext } from './sessions.service';
import { AccountService } from './account.service';
import {
  burnPasswordCheck,
  hashPassword,
  needsRehash,
  verifyPassword,
} from './passwords/password-hasher';
import {
  afterFailedLogin,
  isLocked,
  verificationDeadline,
  verificationOverdue,
} from './account-policy';
import { TwoFactorService } from './two-factor/two-factor.service';
import { PrincipalService } from './principal.service';

const INVALID_CREDENTIALS = 'Invalid credentials';

/** Audience of the short-lived token between password and 2FA code. */
export const MFA_CHALLENGE_AUDIENCE = 'luxa:mfa-challenge';
export const MFA_CHALLENGE_TTL = '5m';

interface ChallengeClaims {
  sub: string;
  typ: 'mfa';
  /** 'Trust this device', carried from the password step. */
  rem: boolean;
}

const invalidCode = () =>
  new UnauthorizedException({
    statusCode: 401,
    code: 'INVALID_CODE',
    message:
      "That code didn't work. Check your authenticator app and try again.",
  });

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionsService: SessionsService,
    private accountService: AccountService,
    private twoFactorService: TwoFactorService,
    private principals: PrincipalService,
  ) {}

  async register(registerDto: RegisterDto, ctx: ClientContext = {}) {
    const { email, password, firstName, lastName, businessName } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await hashPassword(password);

    // Create new user
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      businessName,
      role: 'owner',
      status: 'active',
      emailVerifiedAt: null,
      failedLoginAttempts: 0,
      // New businesses require 2FA for owners and managers (T32).
      requireTwoFactor: true,
    });

    await this.usersRepository.save(user);

    // Owner accounts act as their own tenant
    user.businessId = user.id;
    await this.usersRepository.save(user);
    this.accountService.sendVerificationInBackground(user);

    return {
      message: 'User registered successfully',
      user: await this.toUserResponse(user),
      session: await this.signIn(user, ctx, false),
    };
  }

  async login(loginDto: LoginDto, ctx: ClientContext = {}) {
    const { email, password, remember = false } = loginDto;

    const user = await this.usersRepository.findByEmail(email);

    // Unknown and locked accounts spend the same bcrypt time and get the same
    // answer as a wrong password, so neither existence nor lock state leaks.
    if (!user || isLocked(user)) {
      await burnPasswordCheck(password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!(await verifyPassword(password, user.password))) {
      const next = afterFailedLogin(user);
      user.failedLoginAttempts = next.failedLoginAttempts;
      user.lockedUntil = next.lockedUntil;
      await this.usersRepository.save(user);
      if (next.locked) this.accountService.accountLocked(user, ctx);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Only someone who knows the password learns about these states.
    this.assertMaySignIn(user);

    if (needsRehash(user.password)) {
      user.password = await hashPassword(password);
    }

    if (this.twoFactorService.isEnabled(user)) {
      // No session yet. The failure count is kept, so re-entering the
      // password does not buy more guesses at the code.
      await this.usersRepository.save(user);
      return {
        mfaRequired: true as const,
        challenge: await this.signChallenge(user, remember),
      };
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await this.usersRepository.save(user);

    return {
      user: await this.toUserResponse(user),
      session: await this.signIn(user, ctx, remember),
    };
  }

  /**
   * Second sign-in step: a 6-digit code or a backup code against the
   * challenge from `login`. Wrong codes count toward the same lockout as
   * wrong passwords.
   */
  async verifyTwoFactor(
    challenge: string,
    code: string,
    ctx: ClientContext = {},
  ) {
    const claims = await this.readChallenge(challenge);
    const user = await this.usersRepository.findById(claims.sub);
    if (!user || !this.twoFactorService.isEnabled(user) || isLocked(user)) {
      throw invalidCode();
    }
    this.assertMaySignIn(user);

    const method = await this.twoFactorService.check(
      user,
      code,
      ctx,
      'sign-in',
    );
    if (!method) {
      const next = afterFailedLogin(user);
      user.failedLoginAttempts = next.failedLoginAttempts;
      user.lockedUntil = next.lockedUntil;
      await this.usersRepository.save(user);
      if (next.locked) this.accountService.accountLocked(user, ctx);
      throw invalidCode();
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await this.usersRepository.save(user);

    return {
      user: await this.toUserResponse(user),
      session: await this.signIn(user, ctx, claims.rem),
    };
  }

  /** Rotates the refresh token (see SessionsService.rotate) and re-signs access. */
  async refresh(refreshToken: string, ctx: ClientContext = {}) {
    const { userId, issued } = await this.sessionsService.rotate(
      refreshToken,
      ctx,
    );
    const user = await this.usersRepository.findById(userId);
    if (
      !user ||
      user.status === 'inactive' ||
      verificationOverdue(user) ||
      !(await this.principalOf(user))
    ) {
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

  /** Deactivated accounts and overdue unverified owners may not sign in. */
  private assertMaySignIn(user: User): void {
    if (user.status === 'inactive') throw this.inactive();
    if (verificationOverdue(user)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_UNVERIFIED',
        message:
          'Verify your email address to continue. We can send you a new link.',
      });
    }
  }

  private inactive() {
    return new ForbiddenException({
      statusCode: 403,
      code: 'ACCOUNT_INACTIVE',
      message: 'This account has been deactivated',
    });
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * The user's current principal (role, permissions) in their business.
   * Null when they may not act there, e.g. a deactivated team member.
   */
  private async principalOf(user: User) {
    this.principals.invalidate(user.id);
    return this.principals.resolve(user.id, user.businessId ?? user.id);
  }

  /** Starts a session family and signs the first access token for it. */
  private async signIn(user: User, ctx: ClientContext, persistent: boolean) {
    if (!(await this.principalOf(user))) throw this.inactive();
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

  private signChallenge(user: User, remember: boolean): Promise<string> {
    const claims: ChallengeClaims = { sub: user.id, typ: 'mfa', rem: remember };
    return this.jwtService.signAsync(claims, {
      expiresIn: MFA_CHALLENGE_TTL,
      audience: MFA_CHALLENGE_AUDIENCE,
    });
  }

  private async readChallenge(token: string): Promise<ChallengeClaims> {
    try {
      const claims = await this.jwtService.verifyAsync<ChallengeClaims>(token, {
        audience: MFA_CHALLENGE_AUDIENCE,
      });
      if (claims.typ !== 'mfa' || typeof claims.sub !== 'string') {
        throw new Error('not a challenge');
      }
      return { sub: claims.sub, typ: 'mfa', rem: claims.rem === true };
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'MFA_CHALLENGE_EXPIRED',
        message: 'Your sign-in timed out. Enter your password again.',
      });
    }
  }

  /** Identity only (sub, sid, bid); permissions are resolved per request. */
  private signAccessToken(user: User, sessionId: string) {
    const payload: JwtPayload = {
      sub: user.id,
      sid: sessionId,
      bid: user.businessId ?? user.id,
    };

    const expiresIn: JwtSignOptions['expiresIn'] =
      (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as JwtSignOptions['expiresIn'];

    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async toUserResponse(user: User) {
    const principal = await this.principals.resolve(
      user.id,
      user.businessId ?? user.id,
    );
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      businessId: user.businessId ?? user.id,
      role: user.role,
      avatar: user.avatar,
      permissions: principal?.permissions ?? [],
      maxDiscountPercent: principal?.maxDiscountPercent ?? 0,
      emailVerified: verificationDeadline(user) === null,
      verifyBy: verificationDeadline(user)?.toISOString() ?? null,
      ...(await this.twoFactorService.describe(user)),
    };
  }
}
