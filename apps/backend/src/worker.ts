import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * The job worker (`start:worker`): the same app without HTTP, processing the
 * BullMQ queues and owning the schedules. Run as its own Railway service so
 * it scales apart from the API. Needs REDIS_URL.
 */
async function bootstrap() {
  process.env.LUXA_PROCESS = 'worker';
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  Logger.log('Worker started', 'Bootstrap');
}

bootstrap().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
