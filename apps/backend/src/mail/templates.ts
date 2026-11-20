import type { MailMessage } from './mailer';

const link = (frontendUrl: string, path: string, token: string) => {
  const url = new URL(path, frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
};

export function verifyEmailMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  token: string,
): MailMessage {
  const href = link(frontendUrl, '/auth/verify-email', token);
  return {
    to,
    kind: 'verify-email',
    link: href,
    subject: 'Confirm your LUXA email address',
    text: `Hi ${firstName},\n\nConfirm your email address to keep using LUXA:\n${href}\n\nThe link expires in 30 minutes. If you did not sign up, ignore this email.`,
  };
}

export function resetPasswordMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  token: string,
): MailMessage {
  const href = link(frontendUrl, '/auth/reset-password', token);
  return {
    to,
    kind: 'reset-password',
    link: href,
    subject: 'Reset your LUXA password',
    text: `Hi ${firstName},\n\nUse this link to choose a new password:\n${href}\n\nThe link expires in 30 minutes and works once. If you did not ask for it, ignore this email; your password stays the same.`,
  };
}

export function suspiciousSignInMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  ip: string | undefined,
): MailMessage {
  const reset = new URL('/auth/forgot-password', frontendUrl).toString();
  return {
    to,
    kind: 'suspicious-sign-in',
    subject: 'Sign-in to your LUXA account was paused',
    text: `Hi ${firstName},\n\nThere were several failed attempts to sign in to your account${
      ip ? ` from ${ip}` : ''
    }, so sign-in is paused for 15 minutes.\n\nIf this was not you, reset your password: ${reset}`,
  };
}
