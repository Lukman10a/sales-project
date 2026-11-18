import { UsersRepository } from './users.repository';
import { User } from '../entities/user.entity';

describe('UsersRepository', () => {
  let repository: UsersRepository;

  beforeEach(() => {
    repository = new UsersRepository({
      createEntityManager: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByEmail', () => {
    it('queries a user by email', async () => {
      const user = { id: '1', email: 'a@b.com' } as User;
      const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(user);

      await expect(repository.findByEmail('a@b.com')).resolves.toBe(user);
      expect(findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    });

    it('returns null when no user matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(repository.findByEmail('nope@b.com')).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('queries a user by id', async () => {
      const user = { id: 'abc', email: 'a@b.com' } as User;
      const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue(user);

      await expect(repository.findById('abc')).resolves.toBe(user);
      expect(findOne).toHaveBeenCalledWith({ where: { id: 'abc' } });
    });

    it('returns null when no user matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('claimTotpStep', () => {
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

    it('records a newer step with one conditional update', async () => {
      const qb = stubBuilder(1);
      await expect(repository.claimTotpStep('u1', 42)).resolves.toBe(true);
      expect(qb.set).toHaveBeenCalledWith({ twoFactorLastStep: 42 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '("twoFactorLastStep" IS NULL OR "twoFactorLastStep" < :step)',
        { step: 42 },
      );
    });

    it('refuses a step that is not newer', async () => {
      stubBuilder(0);
      await expect(repository.claimTotpStep('u1', 42)).resolves.toBe(false);
    });
  });
});
