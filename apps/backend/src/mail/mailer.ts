import { Logger } from '@nestjs/common';

export const MAILER = Symbol('MAILER');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Machine-readable kind, for logs and tests. */
  kind: 'verify-email' | 'reset-password' | 'suspicious-sign-in';
  /** The action link, if any (verify / reset). */
  link?: string;
}

/** Outbound email. T39 provides the real transport behind this port. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Stand-in until T39. Outside production it logs the message and link, so the
 * flows work locally. In production it logs only the kind and recipient
 * domain: links grant account access and must never reach logs.
 */
export class LogMailer implements Mailer {
  private readonly logger = new Logger('Mail');

  constructor(private readonly production: boolean) {}

  send(message: MailMessage): Promise<void> {
    if (this.production) {
      const domain = message.to.split('@')[1] ?? 'unknown';
      this.logger.warn(
        `No mail transport configured; dropped ${message.kind} for *@${domain}`,
      );
    } else {
      this.logger.log(
        `[${message.kind}] to ${message.to}: ${message.subject}${
          message.link ? `\n  ${message.link}` : ''
        }`,
      );
    }
    return Promise.resolve();
  }
}
