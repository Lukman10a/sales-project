import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

type ClientError = { status?: unknown; type?: unknown };

/**
 * Body-parser rejects oversized or malformed bodies with a plain error that
 * carries a 4xx `status`. Nest would turn that into a 500; answer with the
 * real status and a short message instead. Everything else falls through to
 * Nest's default handling.
 */
@Catch()
export class HttpErrorsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const status = clientStatus(exception);
    if (status === undefined) {
      super.catch(exception, host);
      return;
    }
    const res = host.switchToHttp().getResponse<Response>();
    res.status(status).json({
      statusCode: status,
      message:
        status === 413 ? 'Request body is too large' : 'Malformed request body',
    });
  }
}

export function clientStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) return undefined;
  if (typeof exception !== 'object' || exception === null) return undefined;
  const { status, type } = exception as ClientError;
  if (typeof type !== 'string' || !type.startsWith('entity.')) return undefined;
  return typeof status === 'number' && status >= 400 && status < 500
    ? status
    : undefined;
}
