import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JobQueue } from '../jobs/job-queue';
import { PermanentJobError } from '../jobs/queues';

/** What the app sends through. Queues the email; a job delivers it. */
export const MAILER = Symbol('MAILER');
/** What actually delivers: Resend, the preview folder, or a recorder. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export type MailKind =
  | 'verify-email'
  | 'reset-password'
  | 'suspicious-sign-in'
  | 'staff-invite'
  | 'new-device'
  | 'trial-ending'
  | 'payment-receipt'
  | 'payment-failed';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Machine-readable kind, for logs, tags and tests. */
  kind: MailKind;
  /** The action link, if any (verify / reset). Grants access: never log it. */
  link?: string;
  /** Stable across retries, so the provider never sends a message twice. */
  id?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** The recipient's domain only: addresses and bodies stay out of logs. */
export const recipientDomain = (to: string) => to.split('@')[1] ?? 'unknown';

/** Sends by adding an `email` job, so a slow or failing provider is retried. */
export class QueuedMailer implements Mailer {
  constructor(private readonly queue: JobQueue) {}

  send(message: MailMessage): Promise<void> {
    return this.queue.add('email', 'send', {
      ...message,
      id: message.id ?? randomUUID(),
    });
  }
}

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(message: MailMessage): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(message.id ? { 'Idempotency-Key': message.id } : {}),
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          tags: [{ name: 'kind', value: message.kind.replace(/-/g, '_') }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new Error(
        `Resend unreachable: ${err instanceof Error ? err.name : 'error'}`,
      );
    }
    if (res.ok) return;
    // Only the status: Resend echoes the request back in some errors.
    const reason = `Resend responded ${res.status} for ${message.kind}`;
    const retryable = res.status === 429 || res.status >= 500;
    throw retryable ? new Error(reason) : new PermanentJobError(reason);
  }
}

/**
 * Development: writes each email to a folder (MAIL_PREVIEW_DIR) as an .html
 * file to open in a browser, plus a .txt copy.
 */
export class PreviewMailer implements Mailer {
  private readonly logger = new Logger('Mail');

  constructor(private readonly dir: string) {}

  async send(message: MailMessage): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = join(this.dir, `${stamp}-${message.kind}`);
    const header = `To: ${message.to}\nSubject: ${message.subject}\n\n`;
    await writeFile(`${base}.txt`, header + message.text, 'utf8');
    if (message.html) await writeFile(`${base}.html`, message.html, 'utf8');
    this.logger.log(
      `[${message.kind}] preview: ${message.html ? `${base}.html` : `${base}.txt`}`,
    );
  }
}

/** Tests: keeps what was sent; nothing leaves the process. */
export class RecordingMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  clear(): void {
    this.sent.length = 0;
  }
}

/**
 * Production without RESEND_API_KEY: drops the email and says so, with the
 * kind and the recipient's domain only.
 */
export class LogMailer implements Mailer {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage): Promise<void> {
    this.logger.warn(
      `No mail transport configured; dropped ${message.kind} for *@${recipientDomain(message.to)}`,
    );
    return Promise.resolve();
  }
}
