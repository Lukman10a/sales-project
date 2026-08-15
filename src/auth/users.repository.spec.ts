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
});
