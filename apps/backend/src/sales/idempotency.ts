import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** How long a key is remembered. */
export const IDEMPOTENCY_TTL_HOURS = 24;

const KEY_PATTERN = /^[\x21-\x7e]{1,255}$/;

/** The `Idempotency-Key` header is required on POST /sales. */
export function requireIdempotencyKey(header: unknown): string {
  const key = Array.isArray(header) ? (header as unknown[])[0] : header;
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    throw new BadRequestException(
      'An Idempotency-Key header (1–255 printable characters) is required',
    );
  }
  return key;
}

/** JSON with object keys sorted, so equal bodies hash the same. */
function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** sha256 hex of the request body. */
export function requestHash(body: unknown): string {
  return createHash('sha256').update(canonical(body)).digest('hex');
}
