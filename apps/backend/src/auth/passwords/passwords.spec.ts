import * as bcrypt from 'bcrypt';
import {
  BCRYPT_COST,
  burnPasswordCheck,
  hashPassword,
  needsRehash,
  verifyPassword,
} from './password-hasher';
import { isCommonPassword, newPasswordSchema } from './password-policy';
import { COMMON_PASSWORDS } from './common-passwords';

describe('password policy', () => {
  const ok = (p: string) => newPasswordSchema.safeParse(p).success;

  it('bundles the top 10k common passwords', () => {
    expect(COMMON_PASSWORDS.size).toBeGreaterThanOrEqual(10_000);
  });

  it('requires at least 10 characters', () => {
    expect(ok('Short1!aa')).toBe(false);
    expect(ok('Long-enough-1')).toBe(true);
  });

  it('caps length at 128', () => {
    expect(ok('a'.repeat(129))).toBe(false);
  });

  it('rejects common passwords regardless of case', () => {
    expect(isCommonPassword('QWERTYUIOP')).toBe(true);
    expect(ok('qwertyuiop')).toBe(false);
    expect(ok('1234567890')).toBe(false);
  });
});

describe('password hasher', () => {
  it(`hashes at cost ${BCRYPT_COST} and verifies`, async () => {
    const hash = await hashPassword('Correct-horse-9');
    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
    await expect(verifyPassword('Correct-horse-9', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('flags hashes below the current cost for re-hashing', async () => {
    expect(needsRehash(await bcrypt.hash('x', 4))).toBe(true);
    expect(needsRehash(await hashPassword('x'))).toBe(false);
    expect(needsRehash('not-a-hash')).toBe(true);
  });

  it('burns a comparison without throwing', async () => {
    await expect(burnPasswordCheck('anything')).resolves.toBeUndefined();
  });
});
