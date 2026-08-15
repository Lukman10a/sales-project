import { UserProfileRepository } from './user-profiles.repository';
import { UserProfile } from '../entities/user-profile.entity';

describe('UserProfileRepository', () => {
  let repository: UserProfileRepository;

  beforeEach(() => {
    repository = new UserProfileRepository({
      createEntityManager: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByUserId', () => {
    it('queries a profile by user id', async () => {
      const profile = { id: 'p1', userId: 'u1' } as UserProfile;
      const findOne = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(profile);

      await expect(repository.findByUserId('u1')).resolves.toBe(profile);
      expect(findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('returns null when no profile matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(repository.findByUserId('missing')).resolves.toBeNull();
    });
  });
});
