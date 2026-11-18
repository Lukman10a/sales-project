import { IsNull } from 'typeorm';
import { AuthTokensRepository } from './auth-tokens.repository';

describe('AuthTokensRepository', () => {
  let repository: AuthTokensRepository;

  beforeEach(() => {
    repository = new AuthTokensRepository({
      createEntityManager: jest.fn(),
    } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('invalidates unused tokens of one purpose', async () => {
    const update = jest
      .spyOn(repository, 'update')
      .mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
    await repository.invalidate('u1', 'verify_email');
    expect(update).toHaveBeenCalledWith(
      { userId: 'u1', purpose: 'verify_email', usedAt: IsNull() },
      { usedAt: expect.any(Date) as Date },
    );
  });

  function stubBuilder(raw: unknown[]) {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw }),
    };
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
    return qb;
  }

  it('spends a live token atomically and returns its owner', async () => {
    const qb = stubBuilder([{ userId: 'u1' }]);
    await expect(repository.consume('h', 'reset_password')).resolves.toBe('u1');
    const calls = [
      ...(qb.where.mock.calls as unknown[][]),
      ...(qb.andWhere.mock.calls as unknown[][]),
    ];
    const conditions = calls.map((c) => c[0] as string);
    expect(conditions).toEqual([
      '"tokenHash" = :tokenHash',
      'purpose = :purpose',
      '"usedAt" IS NULL',
      '"expiresAt" > now()',
    ]);
  });

  it('returns null when nothing was spent', async () => {
    stubBuilder([]);
    await expect(repository.consume('h', 'reset_password')).resolves.toBeNull();
  });
});
