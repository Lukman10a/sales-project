import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);

  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch((err: unknown) => {
  // Invalid env lands here: print the reason and exit non-zero.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
