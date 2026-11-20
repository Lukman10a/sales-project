import {
  LOCKOUT_MS,
  VERIFY_GRACE_MS,
  afterFailedLogin,
  isLocked,
  verificationDeadline,
  verificationOverdue,
} from './account-policy';

const now = new Date('2026-11-17T12:00:00Z');

describe('lockout', () => {
  it('counts failures below the threshold without locking', () => {
    expect(afterFailedLogin({ failedLoginAttempts: 3 }, now)).toEqual({
      failedLoginAttempts: 4,
      lockedUntil: null,
      locked: false,
    });
  });

  it('locks for 15 minutes on the 5th failure and restarts the count', () => {
    const next = afterFailedLogin({ failedLoginAttempts: 4 }, now);
    expect(next.locked).toBe(true);
    expect(next.failedLoginAttempts).toBe(0);
    expect(next.lockedUntil!.getTime() - now.getTime()).toBe(LOCKOUT_MS);
  });

  it('is locked only until lockedUntil', () => {
    const lockedUntil = new Date(now.getTime() + 1000);
    expect(isLocked({ failedLoginAttempts: 0, lockedUntil }, now)).toBe(true);
    expect(
      isLocked(
        { failedLoginAttempts: 0, lockedUntil },
        new Date(now.getTime() + 1000),
      ),
    ).toBe(false);
    expect(isLocked({ failedLoginAttempts: 0 }, now)).toBe(false);
  });
});

describe('email verification', () => {
  const owner = { role: 'owner', createdAt: now };

  it('gives unverified owners 7 days', () => {
    expect(verificationDeadline(owner)!.getTime()).toBe(
      now.getTime() + VERIFY_GRACE_MS,
    );
    expect(verificationOverdue(owner, now)).toBe(false);
    expect(
      verificationOverdue(owner, new Date(now.getTime() + VERIFY_GRACE_MS)),
    ).toBe(true);
  });

  it('owes nothing once verified, or for staff', () => {
    expect(verificationDeadline({ ...owner, emailVerifiedAt: now })).toBeNull();
    expect(verificationDeadline({ ...owner, role: 'manager' })).toBeNull();
    expect(
      verificationOverdue(
        { ...owner, role: 'apprentice' },
        new Date(now.getTime() + 10 * VERIFY_GRACE_MS),
      ),
    ).toBe(false);
  });
});
