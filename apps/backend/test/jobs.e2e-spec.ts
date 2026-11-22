import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { InlineJobQueue } from '../src/jobs/job-queue';
import type { RecordingMailer } from '../src/mail/mailer';

// T39 wiring against the real app: email goes through the job queue to the
// transport, and in tests that transport only records (no network).
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const ORIGIN = 'http://localhost:3000';

suite('Jobs and email (e2e, real Postgres)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication<App>;
  let queue: InlineJobQueue;
  let transport: RecordingMailer;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DB_MANUAL_INIT = 'false';
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const { configureApp } =
      require('../src/bootstrap') as typeof import('../src/bootstrap');
    const { JOB_QUEUE } =
      require('../src/jobs/job-queue') as typeof import('../src/jobs/job-queue');
    const { MAIL_TRANSPORT } =
      require('../src/mail/mailer') as typeof import('../src/mail/mailer');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    queue = app.get(JOB_QUEUE);
    transport = app.get(MAIL_TRANSPORT);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('queues the verification email and the job delivers it, nothing sent', async () => {
    const email = `jobs-${Date.now()}@e2e.luxa.test`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Origin', ORIGIN)
      .set('X-Forwarded-For', '10.9.0.1')
      .set('Idempotency-Key', randomUUID())
      .send({
        email,
        password: 'Correct-Horse-42',
        firstName: 'Ada',
        lastName: 'Obi',
        businessName: 'Jobs Shop',
      })
      .expect(201);

    // Registration queues it in the background; wait for the token, then the job.
    for (let i = 0; i < 50; i++) {
      await queue.drain();
      if (transport.sent.some((m) => m.to === email)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const mail = transport.sent.find((m) => m.to === email);
    expect(mail).toMatchObject({ kind: 'verify-email' });
    expect(mail?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mail?.html).toContain('Confirm email address');
    expect(mail?.link).toContain('/auth/verify-email?token=');
  });
});
