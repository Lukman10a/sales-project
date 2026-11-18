import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '../entities/user.entity';
import { MAILER, type Mailer, type MailMessage } from '../mail/mailer';
import {
  resetPasswordMail,
  suspiciousSignInMail,
  verifyEmailMail,
} from '../mail/templates';
import { UsersRepository } from './users.repository';
import { AuthTokensService } from './auth-tokens.service';
import { SessionsService, type ClientContext } from './sessions.service';
import { hashPassword } from './passwords/password-hasher';

export const GENERIC_EMAIL_SENT =
  'If an account exists for that email, we sent a link to it.';

/**
 * Email verification, password reset and lockout notices. Endpoints that take
 * an email answer the same way whether or not the account exists, and mail
 * is sent off the request path so response time does not tell either.
 */
@Injectable()
export class AccountService {
  private readonly audit = new Logger('AuthAudit');
  private readonly logger = new Logger(AccountService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: AuthTokensService,
    private readonly sessions: SessionsService,
    @Inject(MAILER) private readonly mailer: Mailer,
    config: ConfigService,
  ) {
    this.frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
  }

  /** Sends a verification link to a freshly registered owner. */
  sendVerificationInBackground(user: User): void {
    this.background('verification', async () => {
      const token = await this.tokens.issue(user.id, 'verify_email');
      await this.mailer.send(
        verifyEmailMail(user.email, user.firstName, this.frontendUrl, token),
      );
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.tokens.consume(token, 'verify_email');
    await this.users.update({ id: userId }, { emailVerifiedAt: new Date() });
    return { message: 'Email address confirmed' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);
    if (user && user.role === 'owner' && !user.emailVerifiedAt) {
      this.sendVerificationInBackground(user);
    }
    return { message: GENERIC_EMAIL_SENT };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);
    if (user && user.status !== 'inactive') {
      this.background('password reset', async () => {
        const token = await this.tokens.issue(user.id, 'reset_password');
        await this.mailer.send(
          resetPasswordMail(
            user.email,
            user.firstName,
            this.frontendUrl,
            token,
          ),
        );
      });
    }
    return { message: GENERIC_EMAIL_SENT };
  }

  /**
   * Sets a new password from a reset link. That proves the inbox, so the
   * email counts as verified. The lockout is lifted and every session ends:
   * whoever had the old password is signed out.
   */
  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const userId = await this.tokens.consume(token, 'reset_password');
    const user = await this.users.findById(userId);
    if (user) {
      user.password = await hashPassword(password);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.emailVerifiedAt ??= new Date();
      await this.users.save(user);
      await this.sessions.revokeAll(user.id);
      this.audit.log(
        JSON.stringify({ event: 'auth.password_reset', userId: user.id }),
      );
    }
    return { message: 'Password updated. Sign in with your new password.' };
  }

  /** Called when a run of wrong passwords locks the account. */
  accountLocked(user: User, ctx: ClientContext): void {
    this.audit.warn(
      JSON.stringify({
        event: 'auth.account_locked',
        userId: user.id,
        businessId: user.businessId ?? user.id,
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
        ip: ctx.ip ?? null,
      }),
    );
    this.send(
      suspiciousSignInMail(
        user.email,
        user.firstName,
        this.frontendUrl,
        ctx.ip,
      ),
    );
  }

  private send(message: MailMessage): void {
    this.background(message.kind, () => this.mailer.send(message));
  }

  private background(label: string, work: () => Promise<void>): void {
    void work().catch((err: unknown) => {
      this.logger.error(
        `Could not send ${label} email: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }
}
