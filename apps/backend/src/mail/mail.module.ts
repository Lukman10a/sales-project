import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogMailer, MAILER } from './mailer';

@Global()
@Module({
  providers: [
    {
      provide: MAILER,
      useFactory: (config: ConfigService) =>
        new LogMailer(config.get<string>('NODE_ENV') === 'production'),
      inject: [ConfigService],
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
