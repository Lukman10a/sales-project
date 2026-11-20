import { BadRequestException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AccountService, GENERIC_EMAIL_SENT } from './account.service';
import type { User } from '../entities/user.entity';
import type { MailMessage } from '../mail/mailer';

const flush = () => new Promise((r) => setImmediate(r));

describe('AccountService', () => {
  let users: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
  };
  let tokens: { issue: jest.Mock; consume: jest.Mock };
  let sessions: { revokeAll: jest.Mock };
  let sent: MailMessage[];
  let service: AccountService;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  const owner = (overrides: Partial<User> = {}) =>
    ({
      id: 'u1',
      email: 'ada@shop.ng',
      firstName: 'Ada',
      role: 'owner',
      status: 'active',
      businessId: 'u1',
      emailVerifiedAt: null,
      failedLoginAttempts: 3,
      lockedUntil: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      ...overrides,
    }) as User;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn((u: User) => Promise.resolve(u)),
    };
    tokens = {
      issue: jest.fn().mockResolvedValue('raw-token'),
      consume: jest.fn().mockResolvedValue('u1'),
    };
    sessions = { revokeAll: jest.fn().mockResolvedValue(2) };
    sent = [];
    const mailer = {
      send: jest.fn((m: MailMessage) => {
        sent.push(m);
        return Promise.resolve();
      }),
    };
    const config = {
      getOrThrow: () => 'https://app.luxa.app',
    } as unknown as ConfigService;
    service = new AccountService(
      users as never,
      tokens as never,
      sessions as never,
      mailer,
      config,
    );
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('mails a verification link in the background', async () => {
    service.sendVerificationInBackground(owner());
    await flush();
    expect(tokens.issue).toHaveBeenCalledWith('u1', 'verify_email');
    expect(sent[0]).toMatchObject({ kind: 'verify-email', to: 'ada@shop.ng' });
    expect(sent[0].link).toContain('token=raw-token');
  });

  it('confirms the email from a token', async () => {
    await service.verifyEmail('raw');
    expect(tokens.consume).toHaveBeenCalledWith('raw', 'verify_email');
    expect(users.update).toHaveBeenCalledWith(
      { id: 'u1' },
      { emailVerifiedAt: expect.any(Date) as Date },
    );
  });

  it('propagates a rejected token', async () => {
    tokens.consume.mockRejectedValue(new BadRequestException('expired'));
    await expect(service.verifyEmail('old')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('emails that may not exist', () => {
    it('answers the same for an unknown email and sends nothing', async () => {
      await expect(service.forgotPassword('nobody@x.co')).resolves.toEqual({
        message: GENERIC_EMAIL_SENT,
      });
      await expect(service.resendVerification('nobody@x.co')).resolves.toEqual({
        message: GENERIC_EMAIL_SENT,
      });
      await flush();
      expect(sent).toHaveLength(0);
    });

    it('mails a reset link to a known account', async () => {
      users.findByEmail.mockResolvedValue(owner());
      await expect(service.forgotPassword('ada@shop.ng')).resolves.toEqual({
        message: GENERIC_EMAIL_SENT,
      });
      await flush();
      expect(tokens.issue).toHaveBeenCalledWith('u1', 'reset_password');
      expect(sent[0].kind).toBe('reset-password');
    });

    it('sends no reset link to a deactivated account', async () => {
      users.findByEmail.mockResolvedValue(owner({ status: 'inactive' }));
      await service.forgotPassword('ada@shop.ng');
      await flush();
      expect(sent).toHaveLength(0);
    });

    it('resends verification only to unverified owners', async () => {
      users.findByEmail.mockResolvedValue(
        owner({ emailVerifiedAt: new Date() }),
      );
      await service.resendVerification('ada@shop.ng');
      await flush();
      expect(sent).toHaveLength(0);
    });

    it('logs, never throws, when mail fails', async () => {
      users.findByEmail.mockResolvedValue(owner());
      tokens.issue.mockRejectedValue(new Error('db down'));
      await expect(
        service.forgotPassword('ada@shop.ng'),
      ).resolves.toBeDefined();
      await flush();
      expect(error).toHaveBeenCalled();
    });
  });

  it('resets the password, lifts the lock, verifies the email and ends every session', async () => {
    const user = owner();
    users.findById.mockResolvedValue(user);

    await service.resetPassword('raw', 'Brand-new-pass-1');

    expect(tokens.consume).toHaveBeenCalledWith('raw', 'reset_password');
    expect(user.password).toMatch(/^\$2[aby]\$12\$/);
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(sessions.revokeAll).toHaveBeenCalledWith('u1');
  });

  it('audits a lockout and warns the owner by email', async () => {
    service.accountLocked(owner(), { ip: '9.9.9.9' });
    await flush();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('auth.account_locked'),
    );
    expect(sent[0]).toMatchObject({ kind: 'suspicious-sign-in' });
    expect(sent[0].text).toContain('9.9.9.9');
  });
});
