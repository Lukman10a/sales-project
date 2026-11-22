import { renderHtml, renderText, type EmailContent } from './layout';
import type { MailKind, MailMessage } from './mailer';

const withToken = (frontendUrl: string, path: string, token: string) => {
  const url = new URL(path, frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
};
const page = (frontendUrl: string, path: string) =>
  new URL(path, frontendUrl).toString();

const naira = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const lagosDate = (at: Date) =>
  new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at);

const lagosTime = (at: Date) =>
  new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(at);

function compose(
  to: string,
  kind: MailKind,
  subject: string,
  content: EmailContent,
  link?: string,
): MailMessage {
  return {
    to,
    kind,
    subject,
    text: renderText(content),
    html: renderHtml(content),
    ...(link ? { link } : {}),
  };
}

export function verifyEmailMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  token: string,
): MailMessage {
  const href = withToken(frontendUrl, '/auth/verify-email', token);
  return compose(
    to,
    'verify-email',
    'Confirm your LUXA email address',
    {
      preview: 'One click to confirm your email address.',
      heading: 'Confirm your email address',
      paragraphs: [
        `Hi ${firstName},`,
        'Confirm your email address to keep using LUXA.',
      ],
      action: { label: 'Confirm email address', href },
      footnote:
        'The link expires in 30 minutes. If you did not sign up, ignore this email.',
    },
    href,
  );
}

export function resetPasswordMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  token: string,
): MailMessage {
  const href = withToken(frontendUrl, '/auth/reset-password', token);
  return compose(
    to,
    'reset-password',
    'Reset your LUXA password',
    {
      preview: 'Choose a new password for your account.',
      heading: 'Reset your password',
      paragraphs: [
        `Hi ${firstName},`,
        'Use the button below to choose a new password.',
      ],
      action: { label: 'Choose a new password', href },
      footnote:
        'The link expires in 30 minutes and works once. If you did not ask for it, ignore this email; your password stays the same.',
    },
    href,
  );
}

/** Lockout: a run of failed sign-ins paused the account. */
export function suspiciousSignInMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  ip: string | undefined,
): MailMessage {
  return compose(
    to,
    'suspicious-sign-in',
    'Sign-in to your LUXA account was paused',
    {
      preview:
        'Several failed sign-in attempts paused your account for 15 minutes.',
      heading: 'Sign-in was paused',
      tone: 'warning',
      paragraphs: [
        `Hi ${firstName},`,
        `There were several failed attempts to sign in to your account${ip ? ` from ${ip}` : ''}, so sign-in is paused for 15 minutes.`,
        'If this was you, wait and try again. If it was not, reset your password now.',
      ],
      action: {
        label: 'Reset password',
        href: page(frontendUrl, '/auth/forgot-password'),
      },
    },
  );
}

/** A new staff member was added. The temporary password is never emailed. */
export function staffInviteMail(
  to: string,
  name: string,
  businessName: string,
  invitedBy: string,
  frontendUrl: string,
): MailMessage {
  return compose(
    to,
    'staff-invite',
    `You have been added to ${businessName} on LUXA`,
    {
      preview: `${invitedBy} added you to ${businessName}.`,
      heading: `Join ${businessName} on LUXA`,
      paragraphs: [
        `Hi ${name},`,
        `${invitedBy} added you to ${businessName}'s team on LUXA, where the shop records its sales and stock.`,
        `Sign in with this email address and the temporary password ${invitedBy} gives you. You will choose your own password after.`,
      ],
      action: {
        label: 'Sign in to LUXA',
        href: page(frontendUrl, '/auth/login'),
      },
      footnote: 'If you were not expecting this, you can ignore this email.',
    },
  );
}

export interface NewDeviceDetails {
  at: Date;
  device?: string;
  ip?: string;
  location?: string;
}

export function newDeviceSignInMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  d: NewDeviceDetails,
): MailMessage {
  const details: Array<[string, string]> = [['When', lagosTime(d.at)]];
  if (d.device) details.push(['Device', d.device]);
  if (d.location) details.push(['Location', d.location]);
  if (d.ip) details.push(['IP address', d.ip]);
  return compose(to, 'new-device', 'New sign-in to your LUXA account', {
    preview: 'Your account was signed in to from a new device.',
    heading: 'New sign-in from a device we have not seen',
    paragraphs: [
      `Hi ${firstName},`,
      'Your LUXA account was just signed in to from a new device.',
    ],
    details,
    action: {
      label: 'Review your sessions',
      href: page(frontendUrl, '/settings'),
    },
    footnote:
      'If this was you, there is nothing to do. If not, reset your password and sign out of every session.',
  });
}

export function trialEndingMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  daysLeft: 1 | 3,
  endsOn: Date,
): MailMessage {
  const when = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
  return compose(to, 'trial-ending', `Your LUXA trial ends ${when}`, {
    preview: `Your free trial ends on ${lagosDate(endsOn)}.`,
    heading: `Your trial ends ${when}`,
    paragraphs: [
      `Hi ${firstName},`,
      `Your free LUXA trial ends on ${lagosDate(endsOn)}. Choose a plan to keep recording sales and stock without a break.`,
      'Your data stays safe either way.',
    ],
    action: {
      label: 'Choose a plan',
      href: page(frontendUrl, '/settings'),
    },
  });
}

export interface PaymentDetails {
  amount: number;
  plan: string;
  reference: string;
  paidAt: Date;
}

export function paymentReceiptMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  p: PaymentDetails,
): MailMessage {
  return compose(to, 'payment-receipt', `LUXA receipt: ${naira(p.amount)}`, {
    preview: `We received ${naira(p.amount)} for ${p.plan}.`,
    heading: 'Thanks, your payment went through',
    paragraphs: [`Hi ${firstName},`, 'Here is your receipt.'],
    details: [
      ['Plan', p.plan],
      ['Amount', naira(p.amount)],
      ['Date', lagosDate(p.paidAt)],
      ['Reference', p.reference],
    ],
    action: {
      label: 'View billing',
      href: page(frontendUrl, '/settings'),
    },
  });
}

export interface FailedPaymentDetails {
  amount: number;
  plan: string;
  /** The provider's reason, already safe to show. */
  reason?: string;
}

export function paymentFailedMail(
  to: string,
  firstName: string,
  frontendUrl: string,
  p: FailedPaymentDetails,
): MailMessage {
  return compose(to, 'payment-failed', 'Your LUXA payment did not go through', {
    preview: `We could not take ${naira(p.amount)} for ${p.plan}.`,
    heading: 'Your payment did not go through',
    tone: 'warning',
    paragraphs: [
      `Hi ${firstName},`,
      `We could not take ${naira(p.amount)} for ${p.plan}${p.reason ? `: ${p.reason}` : ''}.`,
      'Update your card or pay another way to keep your plan active.',
    ],
    action: {
      label: 'Update payment',
      href: page(frontendUrl, '/settings'),
    },
  });
}
