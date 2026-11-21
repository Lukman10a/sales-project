import {
  Global,
  Inject,
  Injectable,
  Module,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobRegistry } from '../jobs/job-registry';
import { JOB_QUEUE, type JobQueue } from '../jobs/job-queue';
import {
  LogMailer,
  MAILER,
  MAIL_TRANSPORT,
  PreviewMailer,
  QueuedMailer,
  RecordingMailer,
  ResendMailer,
  type Mailer,
  type MailMessage,
} from './mailer';

/** Picks the transport: tests record, Resend when keyed, else preview or drop. */
export function chooseTransport(config: {
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  MAIL_PREVIEW_DIR?: string;
}): Mailer {
  if (config.NODE_ENV === 'test') return new RecordingMailer();
  if (config.RESEND_API_KEY && config.EMAIL_FROM) {
    return new ResendMailer(config.RESEND_API_KEY, config.EMAIL_FROM);
  }
  if (config.NODE_ENV === 'production') return new LogMailer();
  return new PreviewMailer(config.MAIL_PREVIEW_DIR ?? '.mail-preview');
}

/** Delivers queued `email:send` jobs through the transport. */
@Injectable()
export class EmailJobs implements OnModuleInit {
  constructor(
    private readonly registry: JobRegistry,
    @Inject(MAIL_TRANSPORT) private readonly transport: Mailer,
  ) {}

  onModuleInit(): void {
    this.registry.handle('email', 'send', (data) =>
      this.transport.send(data as MailMessage),
    );
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        chooseTransport({
          NODE_ENV: config.get<string>('NODE_ENV'),
          RESEND_API_KEY: config.get<string>('RESEND_API_KEY'),
          EMAIL_FROM: config.get<string>('EMAIL_FROM'),
          MAIL_PREVIEW_DIR: config.get<string>('MAIL_PREVIEW_DIR'),
        }),
    },
    {
      provide: MAILER,
      inject: [JOB_QUEUE],
      useFactory: (queue: JobQueue) => new QueuedMailer(queue),
    },
    EmailJobs,
  ],
  exports: [MAILER, MAIL_TRANSPORT],
})
export class MailModule {}
