import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpErrorsFilter } from './common/filters/http-errors.filter';

/**
 * HTTP hardening shared by `main.ts` and the e2e suite, so tests exercise
 * exactly what production runs.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const express = app as NestExpressApplication;

  // Railway/Vercel terminate TLS in front of us; trust exactly one proxy hop
  // so req.ip and secure-cookie checks see the real client.
  express.set('trust proxy', 1);
  express.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON only; no HTML, so a locked-down CSP is safe.
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  express.useBodyParser('json', { limit: '1mb' });
  express.useBodyParser('urlencoded', { extended: true, limit: '1mb' });

  app.enableCors({
    origin: config.getOrThrow<string[]>('CORS_ORIGINS'),
    credentials: true,
  });

  app.useGlobalFilters(
    new HttpErrorsFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  app.enableShutdownHooks();
}
