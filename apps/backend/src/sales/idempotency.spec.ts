import { BadRequestException } from '@nestjs/common';
import { requestHash, requireIdempotencyKey } from './idempotency';

describe('idempotency', () => {
  it('requires a printable key of at most 255 characters', () => {
    expect(requireIdempotencyKey('2b0c-uuid')).toBe('2b0c-uuid');
    expect(requireIdempotencyKey(['a', 'b'])).toBe('a');
    for (const bad of [undefined, '', 'has space', 'x'.repeat(256), 5]) {
      expect(() => requireIdempotencyKey(bad)).toThrow(BadRequestException);
    }
  });

  it('hashes equal bodies the same, whatever the key order', () => {
    const a = requestHash({ items: [{ productId: 'p', quantity: 1 }], x: 1 });
    const b = requestHash({ x: 1, items: [{ quantity: 1, productId: 'p' }] });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes different bodies differently, ignoring undefined fields', () => {
    expect(requestHash({ q: 1 })).not.toBe(requestHash({ q: 2 }));
    expect(requestHash({ q: 1, d: undefined })).toBe(requestHash({ q: 1 }));
    expect(requestHash({ at: new Date(0) })).toBe(
      requestHash({ at: '1970-01-01T00:00:00.000Z' }),
    );
  });
});
