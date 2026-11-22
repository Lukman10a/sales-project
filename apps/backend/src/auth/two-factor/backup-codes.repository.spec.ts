import { IsNull } from 'typeorm';
import { TwoFactorBackupCode } from '../../entities/two-factor-backup-code.entity';
import { BackupCodesRepository } from './backup-codes.repository';

describe('BackupCodesRepository', () => {
  let repository: BackupCodesRepository;
  const tx = { delete: jest.fn(), insert: jest.fn() };
  const manager = {
    transaction: jest.fn((work: (t: typeof tx) => Promise<void>) => work(tx)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new BackupCodesRepository({
      createEntityManager: () => manager,
    } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('replaces the whole set in one transaction', async () => {
    await repository.replaceForUser('u1', ['h1', 'h2']);
    expect(manager.transaction).toHaveBeenCalledTimes(1);
    expect(tx.delete).toHaveBeenCalledWith(TwoFactorBackupCode, {
      userId: 'u1',
    });
    expect(tx.insert).toHaveBeenCalledWith(TwoFactorBackupCode, [
      { userId: 'u1', codeHash: 'h1', usedAt: null },
      { userId: 'u1', codeHash: 'h2', usedAt: null },
    ]);
  });

  it('deletes every code of a user', async () => {
    const del = jest
      .spyOn(repository, 'delete')
      .mockResolvedValue({ affected: 3, raw: [] });
    await repository.deleteForUser('u1');
    expect(del).toHaveBeenCalledWith({ userId: 'u1' });
  });

  function stubBuilder(affected: number) {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected }),
    };
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
    return qb;
  }

  it('spends an unused code with one conditional update', async () => {
    const qb = stubBuilder(1);
    await expect(repository.consume('u1', 'h1')).resolves.toBe(true);
    const conditions = [
      ...(qb.where.mock.calls as unknown[][]),
      ...(qb.andWhere.mock.calls as unknown[][]),
    ].map((c) => c[0] as string);
    expect(conditions).toEqual([
      '"userId" = :userId',
      '"codeHash" = :codeHash',
      '"usedAt" IS NULL',
    ]);
  });

  it('reports a used or unknown code', async () => {
    stubBuilder(0);
    await expect(repository.consume('u1', 'h1')).resolves.toBe(false);
  });

  it('counts unused codes', async () => {
    const count = jest.spyOn(repository, 'count').mockResolvedValue(7);
    await expect(repository.countUnused('u1')).resolves.toBe(7);
    expect(count).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: IsNull() },
    });
  });
});
