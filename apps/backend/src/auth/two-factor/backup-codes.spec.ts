import {
  BACKUP_CODE_COUNT,
  generateBackupCode,
  generateBackupCodes,
  isBackupCodeShape,
  normalizeBackupCode,
} from './backup-codes';

describe('backup codes', () => {
  it('generates readable xxxxx-xxxxx codes', () => {
    const code = generateBackupCode();
    expect(code).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
    expect(code).not.toMatch(/[01ilo]/);
  });

  it('generates ten distinct codes by default', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
    expect(new Set(codes).size).toBe(BACKUP_CODE_COUNT);
  });

  it('normalizes case, spaces and dashes', () => {
    expect(normalizeBackupCode(' ABCDE-fghjk ')).toBe('abcdefghjk');
    expect(normalizeBackupCode('abcde fghjk')).toBe('abcdefghjk');
  });

  it('recognises the backup-code shape', () => {
    expect(isBackupCodeShape(generateBackupCode())).toBe(true);
    expect(isBackupCodeShape('ABCDE-FGHJK')).toBe(true);
    expect(isBackupCodeShape('123456')).toBe(false);
    expect(isBackupCodeShape('abcde-fghj0')).toBe(false);
  });
});
