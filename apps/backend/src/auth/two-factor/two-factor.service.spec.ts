import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { User } from '../../entities/user.entity';
import { SecretBox } from '../../common/crypto/secret-box';
import { TwoFactorService } from './two-factor.service';
import { totpAt } from './totp';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  getRounds: jest.fn(() => 12),
}));

describe('TwoFactorService', () => {
  const box = new SecretBox(randomBytes(32));
  const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
  let users: {
    findById: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    claimTotpStep: jest.Mock;
  };
  let backupCodes: {
    replaceForUser: jest.Mock;
    deleteForUser: jest.Mock;
    consume: jest.Mock;
    countUnused: jest.Mock;
  };
  let service: TwoFactorService;

  const owner = (overrides: Partial<User> = {}): User =>
    ({
      id: 'u1',
      email: 'ada@shop.ng',
      password: 'hash',
      role: 'owner',
      businessId: 'u1',
      requireTwoFactor: false,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorLastStep: null,
      ...overrides,
    }) as User;

  const enrolled = (overrides: Partial<User> = {}) =>
    owner({
      twoFactorSecret: box.seal(SECRET),
      twoFactorEnabledAt: new Date(),
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    users = {
      findById: jest.fn(),
      save: jest.fn((u: User) => Promise.resolve(u)),
      update: jest.fn(),
      claimTotpStep: jest.fn().mockResolvedValue(true),
    };
    backupCodes = {
      replaceForUser: jest.fn(),
      deleteForUser: jest.fn(),
      consume: jest.fn().mockResolvedValue(false),
      countUnused: jest.fn().mockResolvedValue(9),
    };
    service = new TwoFactorService(users as never, backupCodes as never, box);
  });

  describe('setup and enable', () => {
    it('stores a sealed secret and returns an otpauth URI', async () => {
      const user = owner();
      users.findById.mockResolvedValue(user);

      const result = await service.beginSetup('u1');

      expect(result.otpauthUri).toContain(`secret=${result.secret}`);
      expect(user.twoFactorSecret).not.toContain(result.secret);
      expect(box.open(user.twoFactorSecret!)).toBe(result.secret);
      expect(user.twoFactorEnabledAt).toBeNull();
    });

    it('refuses setup when 2FA is already on', async () => {
      users.findById.mockResolvedValue(enrolled());
      await expect(service.beginSetup('u1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('enables with the first valid code and returns ten backup codes', async () => {
      const user = owner({ twoFactorSecret: box.seal(SECRET) });
      users.findById.mockResolvedValue(user);

      const { backupCodes: codes } = await service.enable(
        'u1',
        totpAt(SECRET, Date.now()),
      );

      expect(user.twoFactorEnabledAt).toBeInstanceOf(Date);
      expect(user.twoFactorLastStep).toEqual(expect.any(Number));
      expect(codes).toHaveLength(10);
      const [, digests] = backupCodes.replaceForUser.mock.calls[0] as [
        string,
        string[],
      ];
      // Only digests are stored, never the codes.
      expect(digests).toHaveLength(10);
      for (const code of codes) expect(digests).not.toContain(code);
    });

    it('refuses a wrong first code and stays off', async () => {
      const user = owner({ twoFactorSecret: box.seal(SECRET) });
      users.findById.mockResolvedValue(user);
      await expect(service.enable('u1', '000000')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(user.twoFactorEnabledAt).toBeNull();
      expect(backupCodes.replaceForUser).not.toHaveBeenCalled();
    });

    it('needs setup before enable', async () => {
      users.findById.mockResolvedValue(owner());
      await expect(service.enable('u1', '123456')).rejects.toThrow(
        'Start two-step verification setup first.',
      );
    });
  });

  describe('check', () => {
    it('accepts a current TOTP once', async () => {
      const user = enrolled();
      const code = totpAt(SECRET, Date.now());
      await expect(service.check(user, code, {}, 'sign-in')).resolves.toBe(
        'totp',
      );
      expect(users.claimTotpStep).toHaveBeenCalledWith(
        'u1',
        expect.any(Number),
      );
      // The same code again is a replay.
      await expect(service.check(user, code, {}, 'sign-in')).resolves.toBe(
        null,
      );
    });

    it('refuses a TOTP whose step another request already claimed', async () => {
      users.claimTotpStep.mockResolvedValue(false);
      await expect(
        service.check(enrolled(), totpAt(SECRET, Date.now()), {}, 'sign-in'),
      ).resolves.toBeNull();
    });

    it('spends a backup code through the repository', async () => {
      backupCodes.consume.mockResolvedValue(true);
      await expect(
        service.check(enrolled(), 'ABCDE-FGHJK', {}, 'sign-in'),
      ).resolves.toBe('backup_code');
      expect(backupCodes.consume).toHaveBeenCalledWith(
        'u1',
        box.digest('two-factor-backup-code', 'abcdefghjk'),
      );
    });

    it('refuses a used backup code', async () => {
      backupCodes.consume.mockResolvedValue(false);
      await expect(
        service.check(enrolled(), 'abcde-fghjk', {}, 'sign-in'),
      ).resolves.toBeNull();
    });

    it('refuses anything when 2FA is off', async () => {
      await expect(
        service.check(owner(), '123456', {}, 'sign-in'),
      ).resolves.toBeNull();
    });

    it('fails closed when the secret cannot be opened', async () => {
      const other = new SecretBox(randomBytes(32));
      const user = enrolled({ twoFactorSecret: other.seal(SECRET) });
      await expect(
        service.check(user, totpAt(SECRET, Date.now()), {}, 'sign-in'),
      ).resolves.toBeNull();
    });
  });

  describe('disable and regenerate', () => {
    it('turns 2FA off with the password and a code', async () => {
      const user = enrolled();
      users.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.disable('u1', 'pw', totpAt(SECRET, Date.now()));

      expect(user.twoFactorSecret).toBeNull();
      expect(user.twoFactorEnabledAt).toBeNull();
      expect(backupCodes.deleteForUser).toHaveBeenCalledWith('u1');
    });

    it('refuses to disable with a wrong password', async () => {
      users.findById.mockResolvedValue(enrolled());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.disable('u1', 'nope', totpAt(SECRET, Date.now())),
      ).rejects.toThrow('That password is not right.');
    });

    it('refuses to disable with a wrong code', async () => {
      const user = enrolled();
      users.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.disable('u1', 'pw', '000000')).rejects.toThrow(
        "That code didn't work",
      );
      expect(user.twoFactorEnabledAt).toBeInstanceOf(Date);
    });

    it('regenerates backup codes after a valid code', async () => {
      users.findById.mockResolvedValue(enrolled());
      const { backupCodes: codes } = await service.regenerateBackupCodes(
        'u1',
        totpAt(SECRET, Date.now()),
      );
      expect(codes).toHaveLength(10);
      expect(backupCodes.replaceForUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('requirement', () => {
    it('applies the owner setting to the owner', async () => {
      await expect(
        service.describe(owner({ requireTwoFactor: true })),
      ).resolves.toEqual({
        twoFactorEnabled: false,
        twoFactorRequired: true,
        twoFactorSetupRequired: true,
      });
    });

    it("applies the business owner's setting to a manager", async () => {
      users.findById.mockResolvedValue(owner({ requireTwoFactor: true }));
      const manager = owner({
        id: 'm1',
        role: 'manager',
        businessId: 'u1',
      });
      await expect(service.describe(manager)).resolves.toMatchObject({
        twoFactorRequired: true,
      });
      expect(users.findById).toHaveBeenCalledWith('u1');
    });

    it('does not apply to other staff', async () => {
      const cashier = owner({
        id: 's1',
        role: 'cashier',
        businessId: 'u1',
      });
      await expect(service.describe(cashier)).resolves.toMatchObject({
        twoFactorRequired: false,
      });
      expect(users.findById).not.toHaveBeenCalled();
    });

    it('is not owed once 2FA is on', async () => {
      await expect(
        service.describe(enrolled({ requireTwoFactor: true })),
      ).resolves.toMatchObject({ twoFactorSetupRequired: false });
    });

    it('lets only the owner change the setting', async () => {
      await service.setRequirement(
        { id: 'u1', role: 'owner', businessId: 'u1' },
        false,
      );
      expect(users.update).toHaveBeenCalledWith(
        { id: 'u1' },
        { requireTwoFactor: false },
      );
      await expect(
        service.setRequirement(
          { id: 'm1', role: 'manager', businessId: 'u1' },
          false,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('reports status with the remaining backup codes', async () => {
    users.findById.mockResolvedValue(enrolled());
    await expect(service.status('u1')).resolves.toMatchObject({
      twoFactorEnabled: true,
      backupCodesRemaining: 9,
    });
  });
});
