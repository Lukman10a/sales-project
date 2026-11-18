import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '../../entities/user.entity';
import { SECRET_BOX, SecretBox } from '../../common/crypto/secret-box';
import { UsersRepository } from '../users.repository';
import { verifyPassword } from '../passwords/password-hasher';
import type { ClientContext } from '../sessions.service';
import { BackupCodesRepository } from './backup-codes.repository';
import { AuditService, actorOf, businessOf } from '../../audit/audit.service';
import { TransactionRunner } from '../../common/transactions/transactions';
import type { AuditAction } from '../../entities/audit-event.entity';
import {
  generateBackupCodes,
  isBackupCodeShape,
  normalizeBackupCode,
} from './backup-codes';
import { generateTotpSecret, otpauthUri, verifyTotp } from './totp';

export const TOTP_ISSUER = 'LUXA';
const BACKUP_DIGEST = 'two-factor-backup-code';

export type TwoFactorMethod = 'totp' | 'backup_code';

/** What the user payload says about two-step verification. */
export interface TwoFactorState {
  twoFactorEnabled: boolean;
  /** The business requires it for this user's role. */
  twoFactorRequired: boolean;
  /** Required but not set up yet. Enforced from T45, which adds the screens. */
  twoFactorSetupRequired: boolean;
}

const invalidCode = () =>
  new BadRequestException({
    statusCode: 400,
    code: 'INVALID_CODE',
    message:
      "That code didn't work. Check your authenticator app and try again.",
  });

/**
 * Authenticator-app (TOTP) two-step verification: enrolment, backup codes,
 * code checks and the business-wide requirement. The seed is sealed with
 * ENCRYPTION_KEY; backup codes are kept only as keyed digests.
 */
@Injectable()
export class TwoFactorService {
  private readonly audit = new Logger('AuthAudit');
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly backupCodes: BackupCodesRepository,
    @Inject(SECRET_BOX) private readonly box: SecretBox,
    private readonly trail: AuditService,
    private readonly transactions: TransactionRunner,
  ) {}

  isEnabled(user: User): boolean {
    return !!user.twoFactorEnabledAt && !!user.twoFactorSecret;
  }

  async status(userId: string) {
    const user = await this.findOrThrow(userId);
    const enabled = this.isEnabled(user);
    return {
      ...(await this.describe(user)),
      backupCodesRemaining: enabled
        ? await this.backupCodes.countUnused(user.id)
        : 0,
    };
  }

  /**
   * Starts (or restarts) enrolment with a fresh secret. Nothing changes for
   * sign-in until `enable` confirms a first code.
   */
  async beginSetup(userId: string) {
    const user = await this.findOrThrow(userId);
    if (this.isEnabled(user)) throw this.alreadyEnabled();
    const secret = generateTotpSecret();
    user.twoFactorSecret = this.box.seal(secret);
    user.twoFactorEnabledAt = null;
    user.twoFactorLastStep = null;
    await this.users.save(user);
    return {
      secret,
      otpauthUri: otpauthUri({
        secret,
        account: user.email,
        issuer: TOTP_ISSUER,
      }),
    };
  }

  /** Confirms the first code, turns 2FA on and returns backup codes once. */
  async enable(userId: string, code: string, ctx: ClientContext = {}) {
    const user = await this.findOrThrow(userId);
    if (this.isEnabled(user)) throw this.alreadyEnabled();
    const secret = user.twoFactorSecret ? this.openSecret(user) : null;
    if (!secret) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'TWO_FACTOR_SETUP_MISSING',
        message: 'Start two-step verification setup first.',
      });
    }
    const step = verifyTotp(secret, code.trim(), {
      lastStep: user.twoFactorLastStep,
    });
    if (step === null || !(await this.users.claimTotpStep(user.id, step))) {
      this.event('auth.2fa_failed', user, ctx, { purpose: 'enable' });
      throw invalidCode();
    }
    user.twoFactorLastStep = step;
    user.twoFactorEnabledAt = new Date();
    const backupCodes = await this.transactions.run(async () => {
      await this.users.save(user);
      const codes = await this.issueBackupCodes(user.id);
      await this.record(user, 'two_factor.enabled', ctx);
      return codes;
    });
    this.event('auth.2fa_enabled', user, ctx);
    return { backupCodes };
  }

  /** Turns 2FA off. Needs the password and a current (or backup) code. */
  async disable(
    userId: string,
    password: string,
    code: string,
    ctx: ClientContext = {},
  ) {
    const user = await this.findOrThrow(userId);
    if (!this.isEnabled(user)) throw this.notEnabled();
    if (!(await verifyPassword(password, user.password))) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'WRONG_PASSWORD',
        message: 'That password is not right.',
      });
    }
    if (!(await this.check(user, code, ctx, 'disable'))) throw invalidCode();
    user.twoFactorSecret = null;
    user.twoFactorEnabledAt = null;
    user.twoFactorLastStep = null;
    await this.transactions.run(async () => {
      await this.users.save(user);
      await this.backupCodes.deleteForUser(user.id);
      await this.record(user, 'two_factor.disabled', ctx);
    });
    this.event('auth.2fa_disabled', user, ctx);
    return { message: 'Two-step verification is off' };
  }

  /** Replaces every backup code. The old ones stop working. */
  async regenerateBackupCodes(
    userId: string,
    code: string,
    ctx: ClientContext = {},
  ) {
    const user = await this.findOrThrow(userId);
    if (!this.isEnabled(user)) throw this.notEnabled();
    if (!(await this.check(user, code, ctx, 'backup-codes'))) {
      throw invalidCode();
    }
    const backupCodes = await this.transactions.run(async () => {
      const codes = await this.issueBackupCodes(user.id);
      await this.record(user, 'two_factor.backup_codes_regenerated', ctx);
      return codes;
    });
    this.event('auth.2fa_backup_codes_regenerated', user, ctx);
    return { backupCodes };
  }

  /**
   * Checks a 6-digit TOTP or a backup code for a user with 2FA on, spending
   * it so it cannot be used again. Failures and backup-code use are audited.
   * The caller handles lockout.
   */
  async check(
    user: User,
    code: string,
    ctx: ClientContext,
    purpose: string,
  ): Promise<TwoFactorMethod | null> {
    if (!this.isEnabled(user)) return null;
    const input = code.trim();

    if (/^\d{6}$/.test(input)) {
      const secret = this.openSecret(user);
      const step = secret
        ? verifyTotp(secret, input, { lastStep: user.twoFactorLastStep })
        : null;
      if (step !== null && (await this.users.claimTotpStep(user.id, step))) {
        user.twoFactorLastStep = step;
        return 'totp';
      }
    } else if (isBackupCodeShape(input)) {
      const digest = this.box.digest(BACKUP_DIGEST, normalizeBackupCode(input));
      if (await this.backupCodes.consume(user.id, digest)) {
        this.event('auth.2fa_backup_code_used', user, ctx, {
          purpose,
          remaining: await this.backupCodes.countUnused(user.id),
        });
        return 'backup_code';
      }
    }

    this.event('auth.2fa_failed', user, ctx, { purpose });
    return null;
  }

  /** The user's 2FA state, including the business requirement for their role. */
  async describe(user: User): Promise<TwoFactorState> {
    const enabled = this.isEnabled(user);
    const required = await this.isRequiredFor(user);
    return {
      twoFactorEnabled: enabled,
      twoFactorRequired: required,
      twoFactorSetupRequired: required && !enabled,
    };
  }

  /** Business setting: require 2FA for owners and managers. Owners only. */
  async setRequirement(
    actor: {
      id: string;
      role: string;
      businessId: string;
      name?: string;
      email?: string;
      sessionId?: string;
    },
    required: boolean,
    ctx: ClientContext = {},
  ) {
    if (actor.role !== 'owner' || actor.businessId !== actor.id) {
      throw new ForbiddenException(
        'Only the business owner can change this setting',
      );
    }
    await this.transactions.run(async () => {
      await this.users.update({ id: actor.id }, { requireTwoFactor: required });
      await this.trail.record({
        businessId: actor.businessId,
        actor,
        action: 'two_factor.requirement_changed',
        entityType: 'business',
        entityId: actor.businessId,
        after: { required },
        context: ctx,
      });
    });
    this.audit.log(
      JSON.stringify({
        event: 'auth.2fa_requirement_changed',
        userId: actor.id,
        businessId: actor.businessId,
        required,
        ip: ctx.ip ?? null,
      }),
    );
    return { required };
  }

  /** A 2FA change to the user's own account, on the audit trail. */
  private record(
    user: User,
    action: AuditAction,
    ctx: ClientContext,
  ): Promise<void> {
    return this.trail.record({
      businessId: businessOf(user),
      actor: actorOf(user),
      action,
      entityType: 'user',
      entityId: user.id,
      context: ctx,
    });
  }

  private async isRequiredFor(user: User): Promise<boolean> {
    const handlesMoney = user.role === 'owner' || user.role === 'manager';
    if (!handlesMoney) return false;
    const businessId = user.businessId ?? user.id;
    if (businessId === user.id) return user.requireTwoFactor;
    const owner = await this.users.findById(businessId);
    return owner?.requireTwoFactor ?? false;
  }

  private async issueBackupCodes(userId: string): Promise<string[]> {
    const codes = generateBackupCodes();
    await this.backupCodes.replaceForUser(
      userId,
      codes.map((c) => this.box.digest(BACKUP_DIGEST, normalizeBackupCode(c))),
    );
    return codes;
  }

  /** The plaintext seed, or null when it cannot be opened (key changed). */
  private openSecret(user: User): string | null {
    try {
      return this.box.open(user.twoFactorSecret ?? '');
    } catch {
      this.logger.error(
        `Could not open the 2FA secret of user ${user.id}; was ENCRYPTION_KEY changed?`,
      );
      return null;
    }
  }

  private async findOrThrow(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private alreadyEnabled() {
    return new ConflictException({
      statusCode: 409,
      code: 'TWO_FACTOR_ENABLED',
      message: 'Two-step verification is already on.',
    });
  }

  private notEnabled() {
    return new BadRequestException({
      statusCode: 400,
      code: 'TWO_FACTOR_DISABLED',
      message: 'Two-step verification is not on.',
    });
  }

  private event(
    event: string,
    user: User,
    ctx: ClientContext,
    extra: Record<string, unknown> = {},
  ): void {
    const line = JSON.stringify({
      event,
      userId: user.id,
      businessId: user.businessId ?? user.id,
      ...extra,
      ip: ctx.ip ?? null,
    });
    if (event === 'auth.2fa_failed') this.audit.warn(line);
    else this.audit.log(line);
  }
}
