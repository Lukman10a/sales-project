import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpErrorsFilter } from './common/filters/http-errors.filter';
import { csrfProtection } from './common/http/csrf.middleware';
import { requestContextMiddleware } from './common/http/request-context';

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
  // Client ip and user agent for audit records (after trust proxy).
  app.use(requestContextMiddleware);

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

  const origins = config.getOrThrow<string[]>('CORS_ORIGINS');
  app.enableCors({ origin: origins, credentials: true });
  // Cookie sessions: unsafe methods need an allowlisted Origin, plus a
  // double-submit x-csrf-token when authenticated by cookie.
  app.use(csrfProtection(origins));

  app.useGlobalFilters(
    new HttpErrorsFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  app.enableShutdownHooks();
}
