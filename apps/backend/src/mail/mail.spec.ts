import { Logger } from '@nestjs/common';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JobRegistry } from '../jobs/job-registry';
import { InlineJobQueue } from '../jobs/job-queue';
import { PermanentJobError } from '../jobs/queues';
import { escapeHtml, renderHtml } from './layout';
import { chooseTransport, EmailJobs } from './mail.module';
import {
  LogMailer,
  PreviewMailer,
  QueuedMailer,
  RecordingMailer,
  ResendMailer,
  type MailMessage,
} from './mailer';
import {
  newDeviceSignInMail,
  paymentFailedMail,
  paymentReceiptMail,
  resetPasswordMail,
  staffInviteMail,
  suspiciousSignInMail,
  trialEndingMail,
  verifyEmailMail,
} from './templates';

const app = 'https://app.luxa.app';

beforeEach(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('mail templates', () => {
  it('links verification to the web app with the token', () => {
    const m = verifyEmailMail('a@b.co', 'Ada', app, 'tok/+');
    expect(m.link).toBe(
      'https://app.luxa.app/auth/verify-email?token=tok%2F%2B',
    );
    expect(m.text).toContain(m.link);
    expect(m.html).toContain('href="https://app.luxa.app/auth/verify-email');
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
    expect(m.text).toContain('https://app.luxa.app/auth/forgot-password');
  });

  it('invites staff without their temporary password', () => {
    const m = staffInviteMail('k@b.co', 'Kemi', 'Ada Stores', 'Ada', app);
    expect(m.subject).toBe('You have been added to Ada Stores on LUXA');
    expect(m.text).toContain('https://app.luxa.app/auth/login');
    expect(m.text).toContain('temporary password Ada gives you');
  });

  it('describes a new-device sign-in in Lagos time', () => {
    const m = newDeviceSignInMail('a@b.co', 'Ada', app, {
      at: new Date('2026-11-21T23:30:00Z'),
      device: 'Chrome on Android',
      ip: '1.2.3.4',
    });
    expect(m.kind).toBe('new-device');
    expect(m.text).toContain('Device: Chrome on Android');
    expect(m.text).toMatch(/22 Nov 2026/);
  });

  it('counts down the trial: 3 days, then tomorrow', () => {
    const ends = new Date('2026-12-01T10:00:00Z');
    expect(trialEndingMail('a@b.co', 'Ada', app, 3, ends).subject).toBe(
      'Your LUXA trial ends in 3 days',
    );
    const last = trialEndingMail('a@b.co', 'Ada', app, 1, ends);
    expect(last.subject).toBe('Your LUXA trial ends tomorrow');
    expect(last.text).toContain('1 December 2026');
  });

  it('itemises a receipt and explains a failed payment', () => {
    const receipt = paymentReceiptMail('a@b.co', 'Ada', app, {
      amount: 15000,
      plan: 'Growth (monthly)',
      reference: 'PSK_123',
      paidAt: new Date('2026-11-21T09:00:00Z'),
    });
    expect(receipt.subject).toBe('LUXA receipt: ₦15,000.00');
    expect(receipt.text).toContain('Reference: PSK_123');

    const failed = paymentFailedMail('a@b.co', 'Ada', app, {
      amount: 15000,
      plan: 'Growth (monthly)',
      reason: 'Insufficient funds',
    });
    expect(failed.kind).toBe('payment-failed');
    expect(failed.text).toContain('Insufficient funds');
  });

  it('escapes everything it puts into HTML', () => {
    expect(escapeHtml(`<b a="x">'&`)).toBe(
      '&lt;b a=&quot;x&quot;&gt;&#39;&amp;',
    );
    const m = staffInviteMail('k@b.co', '<script>', 'A&B', 'Ada', app);
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('A&amp;B');
    expect(
      renderHtml({
        preview: 'p',
        heading: 'h',
        paragraphs: [],
        tone: 'warning',
      }),
    ).toContain('#ef4444');
  });
});

const message = (over: Partial<MailMessage> = {}): MailMessage => ({
  to: 'ada@shop.ng',
  subject: 'Hello',
  text: 'Body with secret-token',
  html: '<p>Body</p>',
  kind: 'verify-email',
  link: 'https://app.luxa.app/x?token=secret-token',
  ...over,
});

describe('QueuedMailer', () => {
  it('adds an email job with an id that stays the same across retries', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    await new QueuedMailer(queue).send(message());

    const [q, name, data] = queue.add.mock.calls[0] as [
      string,
      string,
      MailMessage,
    ];
    expect([q, name]).toEqual(['email', 'send']);
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.to).toBe('ada@shop.ng');
  });

  it('is delivered by the email job through the transport', async () => {
    const registry = new JobRegistry();
    const transport = new RecordingMailer();
    new EmailJobs(registry, transport).onModuleInit();
    const queue = new InlineJobQueue(registry, 0);

    await new QueuedMailer(queue).send(message());
    await queue.drain();

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].kind).toBe('verify-email');
    transport.clear();
    expect(transport.sent).toHaveLength(0);
  });
});

describe('ResendMailer', () => {
  const respond = (status: number) =>
    jest.fn().mockResolvedValue({ ok: status < 300, status });

  it('posts the message with an idempotency key and a kind tag', async () => {
    const fetchFn = respond(200);
    await new ResendMailer('re_key', 'LUXA <hi@luxa.app>', fetchFn).send(
      message({ id: 'm1' }),
    );

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_key',
      'Idempotency-Key': 'm1',
    });
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'LUXA <hi@luxa.app>',
      to: ['ada@shop.ng'],
      subject: 'Hello',
      html: '<p>Body</p>',
      tags: [{ name: 'kind', value: 'verify_email' }],
    });
  });

  it('retries rate limits and outages, but not a rejected message', async () => {
    const send = (status: number) =>
      new ResendMailer('k', 'f', respond(status)).send(message());

    await expect(send(500)).rejects.not.toBeInstanceOf(PermanentJobError);
    await expect(send(429)).rejects.not.toBeInstanceOf(PermanentJobError);
    await expect(send(422)).rejects.toBeInstanceOf(PermanentJobError);
  });

  it('never puts the body, link or address into its errors', async () => {
    const errors = await Promise.all([
      new ResendMailer('k', 'f', respond(400))
        .send(message())
        .catch((e: unknown) => e),
      new ResendMailer(
        'k',
        'f',
        jest.fn().mockRejectedValue(new Error('ECONNRESET secret-token')),
      )
        .send(message())
        .catch((e: unknown) => e),
    ]);
    for (const err of errors) {
      const text = String((err as Error).message);
      expect(text).not.toMatch(/secret-token|ada@shop/);
    }
  });
});

describe('PreviewMailer', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'luxa-mail-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('writes an .html and a .txt file per email', async () => {
    await new PreviewMailer(join(dir, 'out')).send(message());

    const files = await readdir(join(dir, 'out'));
    expect(files.filter((f) => f.endsWith('-verify-email.html'))).toHaveLength(
      1,
    );
    const txt = files.find((f) => f.endsWith('.txt'))!;
    expect(await readFile(join(dir, 'out', txt), 'utf8')).toContain(
      'Subject: Hello',
    );
  });
});

describe('LogMailer', () => {
  it('logs only the kind and the recipient domain', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');
    await new LogMailer().send(message());

    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain('verify-email');
    expect(line).toContain('*@shop.ng');
    expect(line).not.toMatch(/secret-token|ada@/);
  });
});

describe('chooseTransport', () => {
  it('records in tests, uses Resend when keyed, previews in development', () => {
    expect(
      chooseTransport({
        NODE_ENV: 'test',
        RESEND_API_KEY: 'k',
        EMAIL_FROM: 'f',
      }),
    ).toBeInstanceOf(RecordingMailer);
    expect(
      chooseTransport({
        NODE_ENV: 'production',
        RESEND_API_KEY: 'k',
        EMAIL_FROM: 'f',
      }),
    ).toBeInstanceOf(ResendMailer);
    expect(chooseTransport({ NODE_ENV: 'production' })).toBeInstanceOf(
      LogMailer,
    );
    expect(chooseTransport({ NODE_ENV: 'development' })).toBeInstanceOf(
      PreviewMailer,
    );
  });
});
