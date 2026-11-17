import { IsNull } from 'typeorm';
import { SessionsRepository } from './sessions.repository';
import type { Session } from '../entities/session.entity';

describe('SessionsRepository', () => {
  let repository: SessionsRepository;

  beforeEach(() => {
    repository = new SessionsRepository({
      createEntityManager: jest.fn(),
    } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  const updated = (affected: number) =>
    jest
      .spyOn(repository, 'update')
      .mockResolvedValue({ affected, raw: [], generatedMaps: [] });

  it('finds a row by token hash', async () => {
    const row = { id: 's1' } as Session;
    const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(row);
    await expect(repository.findByTokenHash('h')).resolves.toBe(row);
    expect(findOne).toHaveBeenCalledWith({ where: { tokenHash: 'h' } });
  });

  it('claims only a live row and reports whether it won', async () => {
    const update = updated(1);
    await expect(repository.claim('s1', 'rotated')).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      { id: 's1', revokedAt: IsNull() },
      expect.objectContaining({ revokedReason: 'rotated' }),
    );

    updated(0);
    await expect(repository.claim('s1', 'rotated')).resolves.toBe(false);
  });

  it('revokes a whole family', async () => {
    const update = updated(3);
    await expect(repository.revokeFamily('f1', 'reuse')).resolves.toBe(3);
    expect(update).toHaveBeenCalledWith(
      { familyId: 'f1', revokedAt: IsNull() },
      expect.objectContaining({ revokedReason: 'reuse' }),
    );
  });

  it('revokes a family only when it belongs to the user', async () => {
    const update = updated(1);
    await repository.revokeFamilyForUser('u1', 'f1', 'revoked');
    expect(update).toHaveBeenCalledWith(
      { userId: 'u1', familyId: 'f1', revokedAt: IsNull() },
      expect.anything(),
    );
  });

  it('revokes every session of a user', async () => {
    const update = updated(2);
    await expect(repository.revokeAllForUser('u1', 'logout')).resolves.toBe(2);
    expect(update).toHaveBeenCalledWith(
      { userId: 'u1', revokedAt: IsNull() },
      expect.anything(),
    );
  });

  it('lists live sessions, most recently used first', async () => {
    const find = jest.spyOn(repository, 'find').mockResolvedValue([]);
    await repository.findActiveForUser('u1');
    const [arg] = find.mock.calls[0] as [
      { where: Record<string, unknown>; order: unknown },
    ];
    expect(arg.where.userId).toBe('u1');
    expect(arg.where.revokedAt).toEqual(IsNull());
    expect(arg.order).toEqual({ lastUsedAt: 'DESC' });
  });

  it('checks whether a family is still live', async () => {
    jest.spyOn(repository, 'exists').mockResolvedValue(true);
    await expect(repository.isFamilyActive('f1')).resolves.toBe(true);
  });
});
