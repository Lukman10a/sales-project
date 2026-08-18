# PLAN-007: Phase 7 — Team Management & Granular Permissions Module

- **Module**: Team & Access Control
- **Specification Reference**: [`SPEC-001 Section 4.6: Phase 7 Team Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#46-phase-7-team-management-module)
- **Status**: ✅ Implemented
- **Conventions**: This plan follows the guardrails from [`PLAN-001`](./PLAN-001-development-guardrails.md) and [`TDD_WORKFLOW.md`](../TDD_WORKFLOW.md). Every DTO is a **Zod schema + inferred type** (strict, with `z.enum` for roles/permissions) applied via `ZodValidationPipe`; domain queries live in **colocated repositories** (`TeamRepository`, plus `UsersRepository` imported from `AuthModule`); **no `as any` / `any`** anywhere (strict `no-explicit-any`); atomic multi-entity writes run inside a **repository `transaction(fn)` wrapper**; every logic unit has a **colocated `*.spec.ts`**; the full gate is **`npm run check`**.

---

## 1. Objectives

1. Build team management endpoints (list, get details, invite, update, remove, and update permissions).
2. Enforce strict authorization: Only `owner` or `manager` with `assign-roles` permission can invite or update team members; only `owner` can remove members.
3. Automatically link invited users with the owner's `businessId`.
4. Validate permissions against allowed set (`view-products`, `edit-products`, `delete-products`, `view-sales-history`, `record-sales`, `view-inventory`, `edit-inventory`, `assign-roles`, `view-reports`).
5. Write unit tests for all team operations (service, controller, repository).

---

## 2. Files to Create & Modify

```
src/
├── team/
│   ├── dto/
│   │   ├── invite-member.dto.ts                     # [NEW] Zod schema + inferred type (z.enum for role)
│   │   ├── update-member.dto.ts                     # [NEW] Zod schema + inferred type (role/status/department)
│   │   ├── update-permissions.dto.ts                # [NEW] Zod schema + inferred type (z.array(z.enum(PERMISSIONS)))
│   │   └── query-team.dto.ts                        # [NEW] Zod schema + inferred type (role & status filter)
│   ├── team.constants.ts                            # [NEW] Shared TEAM_ROLES and TEAM_PERMISSIONS `as const` arrays
│   ├── team.repository.ts                           # [NEW] Colocated repository (extends Repository<TeamMember>) + transaction() wrapper
│   ├── team.controller.ts                           # [NEW] Route handlers & guards (ZodValidationPipe)
│   ├── team.service.ts                              # [NEW] Team business logic (no direct TypeORM)
│   ├── team.module.ts                               # [NEW] Module definition (imports AuthModule)
│   ├── team.controller.spec.ts                      # [NEW] Unit test suite (parity)
│   ├── team.service.spec.ts                         # [NEW] Unit test suite
│   └── team.repository.spec.ts                      # [NEW] Unit test suite (parity)
└── app.module.ts                                    # [MODIFY] Register TeamModule
```

**Permissions enum (shared, type-safe):**

`team.constants.ts` exports both shared arrays so DTOs and service logic import from a single source of truth:

```typescript
// team/team.constants.ts
export const TEAM_ROLES = ['manager', 'sales-assistant', 'checkout', 'inventory'] as const;

export const TEAM_PERMISSIONS = [
  'view-products', 'edit-products', 'delete-products',
  'view-sales-history', 'record-sales', 'view-inventory',
  'edit-inventory', 'assign-roles', 'view-reports',
] as const;
```

DTOs import from the constants file rather than redeclaring:

```typescript
// team/dto/update-permissions.dto.ts
import { TEAM_PERMISSIONS } from '../team.constants';

export const UpdatePermissionsDtoSchema = z.object({
  permissions: z.array(z.enum(TEAM_PERMISSIONS)),
}).strict();

export type UpdatePermissionsDto = z.infer<typeof UpdatePermissionsDtoSchema>;
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/team` | `owner` \| `manager` (`assign-roles`) | List all team members for current business |
| `GET` | `/api/team/:id` | Authenticated | Get single team member details |
| `POST` | `/api/team` | `owner` \| `manager` (`assign-roles`) | Invite new member (creates User + TeamMember) |
| `PATCH`| `/api/team/:id` | `owner` \| `manager` (`assign-roles`) | Update member role, status, or department |
| `DELETE`| `/api/team/:id` | `owner` only | Remove team member |
| `PATCH`| `/api/team/:id/permissions` | `owner` \| `manager` (`assign-roles`) | Update granular permissions array |

---

## 4. Invitation & Provisioning Logic

The service injects `UsersRepository` (from the imported `AuthModule`) and `TeamRepository`. The two entity writes are atomic via the repository `transaction()` wrapper. **No `as any`** — roles are typed via Zod `z.enum`, and `staffRole` uses the shared role type.

Inside the transaction, the service delegates to manager-based helper methods on `TeamRepository` (`createUser` / `saveUser` / `createMember` / `saveMember`) so that all writes share the same `EntityManager` and roll back together on failure.

```typescript
async inviteMember(user: CurrentUserPayload, inviteDto: InviteMemberDto) {
  const existing = await this.usersRepository.findByEmail(inviteDto.email);
  if (existing) {
    throw new BadRequestException('A user with this email already exists');
  }

  return this.teamRepository.transaction(async (manager) => {
    const tempPassword = await bcrypt.hash(randomBytes(8).toString('hex'), 10);

    const newUser = this.teamRepository.createUser(manager, {
      email: inviteDto.email,
      password: tempPassword,
      firstName: inviteDto.name.split(' ')[0] || inviteDto.name,
      lastName: inviteDto.name.split(' ').slice(1).join(' ') || '',
      businessName: user.businessName,
      businessId: user.businessId,
      role: inviteDto.role === 'manager' ? 'manager' : 'apprentice',
      staffRole: inviteDto.role,
      status: 'invited',
    });
    const savedUser = await this.teamRepository.saveUser(manager, newUser);

    const teamMember = this.teamRepository.createMember(manager, {
      businessId: user.businessId,
      userId: savedUser.id,
      name: inviteDto.name,
      role: inviteDto.role,
      permissions: inviteDto.permissions ?? [],
      department: inviteDto.department,
      status: 'invited',
      joinedDate: new Date(),
    });
    const savedMember = await this.teamRepository.saveMember(manager, teamMember);

    return {
      id: savedMember.id,
      email: savedUser.email,
      name: savedMember.name,
      role: savedMember.role,
      status: savedMember.status,
      message: 'Invitation sent to email',
    };
  });
}
```

> Note: bcrypt must be `jest.mock`ed in `team.service.spec.ts` (native binding — `jest.spyOn` fails; see PLAN-001 notes).

---

## 5. Verification Checklist

- [x] Non-owners and unauthorized staff cannot access `/api/team` management endpoints.
- [x] Inviting a member creates both a `User` entity (with `businessId`) and a `TeamMember` entity atomically.
- [x] Member deletion is strictly restricted to `owner`.
- [x] Permissions array updates take effect immediately in the database.
- [x] No `any`/`as any`; roles/permissions validated via Zod `z.enum`.
- [x] All queries enforce `where: { businessId: user.businessId }`.
- [x] Test parity holds: `npm run check:tdd` reports 0 missing specs.
- [x] Full gate passes: `npm run check` (lint, typecheck, arch, parity, unit, e2e, build).

## 6. Implementation Notes

- Management endpoints (`GET/`, `POST/`, `PATCH/:id`, `PATCH/:id/permissions`) are guarded with
  `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles('owner', 'manager')` +
  `@RequirePermissions('assign-roles')`. `DELETE/:id` is owner-only; `GET/:id` is authenticated only.
- Invite role is restricted to `manager | sales-assistant | checkout | inventory` so the
  `User.role`/`User.staffRole` mapping stays type-safe (no `as any`).
- **Atomicity**: both the `User` and `TeamMember` rows are written inside
  `teamRepository.transaction(fn)` using manager-based helpers (`createUser/saveUser/createMember/saveMember`),
  so the multi-entity invite commits or rolls back together. The email pre-check uses
  `UsersRepository.findByEmail` (injected from `AuthModule`).
- `DELETE /team/:id` removes only the `TeamMember` row (the linked `User` account is preserved).
- `TeamMember` records are returned without the `user` relation to avoid leaking `User.password` hashes.
- Managers granted `assign-roles` see it in the DB immediately; the JWT `permissions` field is populated by
  `AuthService.generateTokens` (out of scope for this phase), so a manager must re-issue tokens to use the
  management endpoints. Owner bypasses all permission checks by design.
