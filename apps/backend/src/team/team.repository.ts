import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertTenant } from '../common/tenancy/assert-tenant';

export interface TeamMemberWithEmail extends Omit<TeamMember, 'user'> {
  email?: string;
}

export interface TeamListQuery {
  page: number;
  limit: number;
  role?: TeamMember['role'];
  status?: TeamMember['status'];
}

export interface TeamMemberUpdateData {
  role?: TeamMember['role'];
  status?: TeamMember['status'];
  department?: string | null;
  permissions?: string[];
  maxDiscountPercent?: number;
}

/** Tenant-owned: every method takes `businessId` first. */
@Injectable()
export class TeamRepository extends Repository<TeamMember> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(TeamMember, dataSource.createEntityManager());
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  createUser(
    businessId: string,
    manager: EntityManager,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      businessName: string;
      role: TeamMember['role'];
      status: 'invited';
    },
  ): User {
    return manager.create(User, { ...data, businessId });
  }

  saveUser(businessId: string, manager: EntityManager, user: User) {
    assertTenant(businessId, user);
    return manager.save(user);
  }

  /** The member's login account, kept in step with role and status. */
  async updateUser(
    businessId: string,
    userId: string,
    data: Partial<Pick<User, 'role' | 'status'>>,
  ): Promise<void> {
    await this.manager.update(User, { id: userId, businessId }, data);
  }

  createMember(
    businessId: string,
    manager: EntityManager,
    data: {
      userId: string;
      name: string;
      role: TeamMember['role'];
      permissions: string[];
      maxDiscountPercent: number;
      department?: string;
      status: 'invited';
      joinedDate: Date;
    },
  ): TeamMember {
    return manager.create(TeamMember, { ...data, businessId });
  }

  saveMember(
    businessId: string,
    manager: EntityManager,
    member: TeamMember,
  ): Promise<TeamMember> {
    assertTenant(businessId, member);
    return manager.save(member);
  }

  async list(
    businessId: string,
    query: TeamListQuery,
  ): Promise<PaginatedResult<TeamMemberWithEmail>> {
    const { page, limit, role, status } = query;

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

  findById(businessId: string, id: string): Promise<TeamMember | null> {
    return this.findOne({ where: { id, businessId } });
  }

  async updateMember(
    businessId: string,
    member: TeamMember,
    data: TeamMemberUpdateData,
  ): Promise<TeamMember> {
    assertTenant(businessId, member);
    Object.assign(member, data);
    return this.manager.save(member);
  }

  async removeMember(businessId: string, member: TeamMember): Promise<void> {
    assertTenant(businessId, member);
    await this.manager.remove(member);
  }
}
