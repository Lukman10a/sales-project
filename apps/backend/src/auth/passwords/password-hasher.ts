import * as bcrypt from 'bcrypt';

/** bcrypt work factor for new hashes. Older hashes are upgraded at sign-in. */
export const BCRYPT_COST = 12;

export const hashPassword = (password: string) =>
  bcrypt.hash(password, BCRYPT_COST);

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

/** True when the hash uses a lower cost than BCRYPT_COST (or is unreadable). */
export function needsRehash(hash: string): boolean {
  try {
    return bcrypt.getRounds(hash) < BCRYPT_COST;
  } catch {
    return true;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Spends the same bcrypt time as a real check when there is no account, or
 * when the account is locked. Timing then never reveals whether an email
 * exists.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash('luxa-timing-equaliser', BCRYPT_COST);
  await bcrypt.compare(password, await dummyHash);
}
