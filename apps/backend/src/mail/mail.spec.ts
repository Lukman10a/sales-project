import { Logger } from '@nestjs/common';
import { LogMailer } from './mailer';
import {
  resetPasswordMail,
  suspiciousSignInMail,
  verifyEmailMail,
} from './templates';

describe('mail templates', () => {
  const app = 'https://app.luxa.app';

  it('links verification to the web app with the token', () => {
    const m = verifyEmailMail('a@b.co', 'Ada', app, 'tok/+');
    expect(m.link).toBe(
      'https://app.luxa.app/auth/verify-email?token=tok%2F%2B',
    );
    expect(m.text).toContain(m.link);
    expect(m.kind).toBe('verify-email');
  });

  it('links password reset to the web app', () => {
    const m = resetPasswordMail('a@b.co', 'Ada', app, 't1');
    expect(m.link).toBe('https://app.luxa.app/auth/reset-password?token=t1');
    expect(m.text).toMatch(/30 minutes/);
  });

  it('warns about failed sign-ins without any token', () => {
    const m = suspiciousSignInMail('a@b.co', 'Ada', app, '1.2.3.4');
    expect(m.link).toBeUndefined();
    expect(m.text).toContain('1.2.3.4');
    expect(m.text).toContain('/auth/forgot-password');
  });
});

describe('LogMailer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs the link outside production', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    await new LogMailer(false).send(
      verifyEmailMail('a@b.co', 'Ada', 'http://localhost:3000', 'secret'),
    );
    expect(log.mock.calls[0][0]).toContain('token=secret');
  });

  it('never logs links or addresses in production', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await new LogMailer(true).send(
      resetPasswordMail('ada@shop.ng', 'Ada', 'https://app.luxa.app', 'secret'),
    );
    const line = String(warn.mock.calls[0][0]);
    expect(line).not.toContain('secret');
    expect(line).not.toContain('ada@');
    expect(line).toContain('*@shop.ng');
  });
});
