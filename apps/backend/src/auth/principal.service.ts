import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../entities/user.entity';
import { ROLE_PRESETS, isPermission } from '../common/constants/permissions';
import { UsersRepository } from './users.repository';
import { TeamMemberRepository } from './team-members.repository';
import {
  PRINCIPAL_CACHE,
  type Principal,
  type PrincipalCache,
} from './principal-cache';

export {
  MemoryPrincipalCache,
  PRINCIPAL_CACHE,
  PRINCIPAL_TTL_MS,
  RedisPrincipalCache,
  type Principal,
  type PrincipalCache,
} from './principal-cache';

@Injectable()
export class PrincipalService {
  constructor(
    private readonly users: UsersRepository,
    private readonly members: TeamMemberRepository,
    @Inject(PRINCIPAL_CACHE) private readonly cache: PrincipalCache,
  ) {}

  /**
   * The principal for a user acting in a business, or null when they may not:
   * unknown or deactivated user, another business, or no active membership.
   */
  async resolve(userId: string, businessId: string): Promise<Principal | null> {
    const cached = await this.cache.get(userId);
    if (cached) return cached.businessId === businessId ? cached : null;

    const user = await this.users.findById(userId);
    if (!user || user.status === 'inactive') return null;
    if ((user.businessId ?? user.id) !== businessId) return null;

    const principal = await this.build(user, businessId);
    if (principal) await this.cache.set(userId, principal);
    return principal;
  }

  /** Call after anything that changes what the user may do. */
  invalidate(userId: string): Promise<void> {
    return this.cache.delete(userId);
  }

  private async build(
    user: User,
    businessId: string,
  ): Promise<Principal | null> {
    const base = {
      id: user.id,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      email: user.email,
      businessId,
      businessName: user.businessName,
    };
    if (user.role === 'owner' && businessId === user.id) {
      return {
        ...base,
        role: 'owner',
        permissions: [...ROLE_PRESETS.owner.permissions],
        maxDiscountPercent: ROLE_PRESETS.owner.maxDiscountPercent,
      };
    }

    const member = await this.members.findByBusinessAndUser(
      businessId,
      user.id,
    );
    if (!member || member.status === 'inactive') {
      return null;
    }
    return {
      ...base,
      role: member.role,
      permissions: member.permissions.filter(isPermission),
      maxDiscountPercent: member.maxDiscountPercent,
    };
  }
}
