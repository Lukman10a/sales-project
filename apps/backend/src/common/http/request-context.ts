import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

/** Where the current request came from, for audit records. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

const store = new AsyncLocalStorage<RequestContext>();

/** The current request's context; empty outside a request (jobs, tests). */
export const requestContext = (): RequestContext => store.getStore() ?? {};

/** Express middleware that opens a context for each request. */
export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userAgent = req.headers['user-agent'];
  store.run({ ip: req.ip, userAgent }, () => next());
}
