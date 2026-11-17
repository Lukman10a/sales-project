import { BadRequestException } from '@nestjs/common';
import { clientStatus } from './http-errors.filter';

describe('clientStatus', () => {
  it('keeps body-parser 413s', () => {
    expect(clientStatus({ status: 413, type: 'entity.too.large' })).toBe(413);
  });

  it('keeps body-parser 400s for malformed JSON', () => {
    expect(clientStatus({ status: 400, type: 'entity.parse.failed' })).toBe(
      400,
    );
  });

  it('ignores Nest HTTP exceptions', () => {
    expect(clientStatus(new BadRequestException())).toBeUndefined();
  });

  it('ignores unrelated errors so they stay 500s', () => {
    expect(clientStatus(new Error('boom'))).toBeUndefined();
    expect(clientStatus({ status: 500, type: 'entity.x' })).toBeUndefined();
    expect(clientStatus('nope')).toBeUndefined();
  });
});
