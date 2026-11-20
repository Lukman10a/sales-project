/**
 * Pure account-security rules, kept apart from I/O so they are easy to test.
 */

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MS = 15 * 60_000;
/** Owners may use an unverified account this long after sign-up. */
export const VERIFY_GRACE_MS = 7 * 24 * 60 * 60_000;

interface LockoutState {
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
}

interface VerificationState {
  role: string;
  createdAt: Date;
  emailVerifiedAt?: Date | null;
}

export const isLocked = (user: LockoutState, now = new Date()) =>
  !!user.lockedUntil && user.lockedUntil.getTime() > now.getTime();

/**
 * The state after one more wrong password. The threshold-th failure locks
 * the account and restarts the count, so each lock needs a fresh run of
 * failures.
 */
export function afterFailedLogin(
  user: LockoutState,
  now = new Date(),
): { failedLoginAttempts: number; lockedUntil: Date | null; locked: boolean } {
  const attempts = user.failedLoginAttempts + 1;
  if (attempts >= LOCKOUT_THRESHOLD) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MS),
      locked: true,
    };
  }
  return {
    failedLoginAttempts: attempts,
    lockedUntil: user.lockedUntil ?? null,
    locked: false,
  };
}

/** When an unverified owner must verify by, or null if nothing is owed. */
export function verificationDeadline(user: VerificationState): Date | null {
  if (user.role !== 'owner' || user.emailVerifiedAt) return null;
  return new Date(user.createdAt.getTime() + VERIFY_GRACE_MS);
}

export function verificationOverdue(
  user: VerificationState,
  now = new Date(),
): boolean {
  const deadline = verificationDeadline(user);
  return deadline !== null && deadline.getTime() <= now.getTime();
}
