import { TeamMemberRepository } from './team-members.repository';
import { TeamMember } from '../entities/team-member.entity';

describe('TeamMemberRepository', () => {
  let repository: TeamMemberRepository;

  beforeEach(() => {
    repository = new TeamMemberRepository({
      createEntityManager: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByBusinessAndUser', () => {
    it('queries a member by businessId and userId', async () => {
      const member = {
        id: 'm1',
        businessId: 'b1',
        userId: 'u1',
      } as TeamMember;
      const findOne = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(member);

      await expect(repository.findByBusinessAndUser('b1', 'u1')).resolves.toBe(
        member,
      );
      expect(findOne).toHaveBeenCalledWith({
        where: { businessId: 'b1', userId: 'u1' },
      });
    });

    it('returns null when no member matches', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        repository.findByBusinessAndUser('b1', 'missing'),
      ).resolves.toBeNull();
    });
  });
});
