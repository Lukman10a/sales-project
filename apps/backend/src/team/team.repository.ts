import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

export interface TeamMemberWithEmail extends Omit<TeamMember, 'user'> {
  email?: string;
}

export interface TeamListQuery {
  businessId: string;
  page: number;
  limit: number;
  role?: TeamMember['role'];
  status?: TeamMember['status'];
}

export interface TeamMemberUpdateData {
  role?: TeamMember['role'];
  status?: TeamMember['status'];
  department?: string | null;
}

@Injectable()
export class TeamRepository extends Repository<TeamMember> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(TeamMember, dataSource.createEntityManager());
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  createUser(
    manager: EntityManager,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      businessName: string;
      businessId: string;
      role: 'manager' | 'apprentice';
      staffRole: 'sales-assistant' | 'manager' | 'checkout' | 'inventory';
      status: 'invited';
    },
  ): User {
    return manager.create(User, data);
  }

  saveUser(manager: EntityManager, user: User): Promise<User> {
    return manager.save(user);
  }

  createMember(
    manager: EntityManager,
    data: {
      businessId: string;
      userId: string;
      name: string;
      role: TeamMember['role'];
      permissions: string[];
      department?: string;
      status: 'invited';
      joinedDate: Date;
    },
  ): TeamMember {
    return manager.create(TeamMember, data);
  }

  saveMember(manager: EntityManager, member: TeamMember): Promise<TeamMember> {
    return manager.save(member);
  }

  async list(
    query: TeamListQuery,
  ): Promise<PaginatedResult<TeamMemberWithEmail>> {
    const { businessId, page, limit, role, status } = query;

    const qb = this.createQueryBuilder('team')
      .leftJoin('team.user', 'user')
      .addSelect('user.email')
      .where('team.businessId = :businessId', { businessId });

    if (role) {
      qb.andWhere('team.role = :role', { role });
    }
    if (status) {
      qb.andWhere('team.status = :status', { status });
    }

    qb.orderBy('team.createdAt', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((member) => {
        const { user, ...rest } = member;
        return {
          ...rest,
          email: (user as { email?: string } | undefined)?.email,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findByIdAndBusiness(
    id: string,
    businessId: string,
  ): Promise<TeamMember | null> {
    return this.findOne({ where: { id, businessId } });
  }

  async updateMember(
    member: TeamMember,
    data: TeamMemberUpdateData,
  ): Promise<TeamMember> {
    Object.assign(member, data);
    return this.manager.save(member);
  }

  async updatePermissions(
    member: TeamMember,
    permissions: string[],
  ): Promise<TeamMember> {
    member.permissions = permissions;
    return this.manager.save(member);
  }

  async removeMember(member: TeamMember): Promise<void> {
    await this.manager.remove(member);
  }
}
