import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const TestSchema = z
  .object({
    email: z.email(),
    age: z.coerce.number().int().min(0),
  })
  .strict();

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(TestSchema);

  it('returns parsed data for a valid payload', () => {
    const result = pipe.transform({ email: 'user@example.com', age: 30 });
    expect(result).toEqual({ email: 'user@example.com', age: 30 });
  });

  it('coerces string values into typed fields', () => {
    const result = pipe.transform({ email: 'user@example.com', age: '25' });
    expect(result).toEqual({ email: 'user@example.com', age: 25 });
  });

  it('throws BadRequestException for an invalid payload', () => {
    expect(() => pipe.transform({ email: 'not-an-email', age: -1 })).toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown (non-whitelisted) fields', () => {
    expect(() =>
      pipe.transform({ email: 'user@example.com', age: 1, extra: true }),
    ).toThrow(BadRequestException);
  });

  it('formats validation errors with paths and messages', () => {
    try {
      pipe.transform({ email: 'not-an-email', age: 1 });
      throw new Error('Expected transform to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: Array<{ path: string; message: string }>;
      };
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'email' })]),
      );
    }
  });
});
