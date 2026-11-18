import { z } from 'zod';
import { COMMON_PASSWORDS } from './common-passwords';

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export const isCommonPassword = (password: string) =>
  COMMON_PASSWORDS.has(password.trim().toLowerCase());

/**
 * Rules for every new password (sign-up, change, reset). Sign-in deliberately
 * does not apply them, so accounts created under the old 8-character rule
 * keep working.
 */
export const newPasswordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  )
  .max(
    MAX_PASSWORD_LENGTH,
    `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
  )
  .refine((p) => !isCommonPassword(p), {
    message: 'This password is too common. Choose something less guessable',
  });
