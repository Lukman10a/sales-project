import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../entities/user.entity';
import {
  ROLE_PRESETS,
  isPermission,
  type Permission,
  type UserRole,
} from '../common/constants/permissions';
import { UsersRepository } from './users.repository';
import { TeamMemberRepository } from './team-members.repository';

/**
 * Who is making a request, resolved from the database rather than from the
 * token, so a permission change or a deactivation applies on the very next
 * request.
 */
export interface Principal {
  id: string;
  email: string;
  role: UserRole;
  businessId: string;
  businessName: string;
  permissions: Permission[];
  maxDiscountPercent: number;
}

export const PRINCIPAL_CACHE = Symbol('PRINCIPAL_CACHE');

/**
 * Short-lived principal cache. Writers call `delete` whenever what a
 * principal can do changes. The in-memory version is per process; T39 moves
 * it to Redis so every instance sees an invalidation.
 */
export interface PrincipalCache {
  get(userId: string): Principal | undefined;
  set(userId: string, principal: Principal): void;
  delete(userId: string): void;
}

export const PRINCIPAL_TTL_MS = 30_000;

export class MemoryPrincipalCache implements PrincipalCache {
  private readonly entries = new Map<
    string,
    { principal: Principal; expiresAt: number }
  >();

  constructor(
    private readonly ttlMs = PRINCIPAL_TTL_MS,
    private readonly now = () => Date.now(),
  ) {}

  get(userId: string): Principal | undefined {
    const entry = this.entries.get(userId);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(userId);
      return undefined;
    }
    return entry.principal;
  }

  set(userId: string, principal: Principal): void {
    this.entries.set(userId, {
      principal,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  delete(userId: string): void {
    this.entries.delete(userId);
  }
}

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
    const cached = this.cache.get(userId);
    if (cached) return cached.businessId === businessId ? cached : null;

    const user = await this.users.findById(userId);
    if (!user || user.status === 'inactive') return null;
    if ((user.businessId ?? user.id) !== businessId) return null;

    const principal = await this.build(user, businessId);
    if (principal) this.cache.set(userId, principal);
    return principal;
  }

  /** Call after anything that changes what the user may do. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  private async build(
    user: User,
    businessId: string,
  ): Promise<Principal | null> {
    const base = {
      id: user.id,
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
