import { randomInt } from 'node:crypto';

/**
 * Single-use recovery codes for when the phone is lost. Shown once, stored
 * only as keyed digests. Pure helpers; no I/O.
 */

export const BACKUP_CODE_COUNT = 10;
/** No 0/o, 1/l/i: codes get read off paper. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const LENGTH = 10;

/** One code, shown as `xxxxx-xxxxx` (about 50 bits). */
export function generateBackupCode(): string {
  let raw = '';
  for (let i = 0; i < LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateBackupCode());
  return [...codes];
}

/** Lowercase, without spaces or dashes: the form that gets digested. */
export const normalizeBackupCode = (input: string): string =>
  input.toLowerCase().replace(/[\s-]/g, '');

export const isBackupCodeShape = (input: string): boolean =>
  new RegExp(`^[${ALPHABET}]{${LENGTH}}$`).test(normalizeBackupCode(input));
