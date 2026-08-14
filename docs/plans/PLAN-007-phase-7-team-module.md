# PLAN-007: Phase 7 — Team Management & Granular Permissions Module

- **Module**: Team & Access Control
- **Specification Reference**: [`SPEC-001 Section 4.6: Phase 7 Team Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#46-phase-7-team-management-module)
- **Status**: ⏳ Pending Implementation

---

## 1. Objectives

1. Build team management endpoints (list, get details, invite, update, remove, and update permissions).
2. Enforce strict authorization: Only `owner` or `manager` with `assign-roles` permission can invite or update team members; only `owner` can remove members.
3. Automatically link invited users with the owner's `businessId`.
4. Validate permissions against allowed set (`view-products`, `edit-products`, `delete-products`, `view-sales-history`, `record-sales`, `view-inventory`, `edit-inventory`, `assign-roles`, `view-reports`).
5. Write unit tests for all team operations.

---

## 2. Files to Create & Modify

```
src/
├── team/
│   ├── dto/
│   │   ├── invite-member.dto.ts                     # [NEW] Member invitation payload
│   │   ├── update-member.dto.ts                     # [NEW] Role, department, status update
│   │   ├── update-permissions.dto.ts                # [NEW] Permissions array update
│   │   └── query-team.dto.ts                        # [NEW] Role & status filter DTO
│   ├── team.controller.ts                           # [NEW] Route handlers & guards
│   ├── team.service.ts                              # [NEW] Team business logic
│   ├── team.module.ts                               # [NEW] Module definition
│   └── team.service.spec.ts                         # [NEW] Unit test suite
└── app.module.ts                                    # [MODIFY] Register TeamModule
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

```typescript
async inviteMember(user: CurrentUserPayload, inviteDto: InviteMemberDto) {
  // 1. Check if email already exists
  let existingUser = await this.userRepo.findOne({ where: { email: inviteDto.email } });
  if (existingUser) {
    throw new BadRequestException('A user with this email already exists');
  }

  // 2. Create User account with temporary password & inherited businessId
  const tempPassword = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);
  const newUser = this.userRepo.create({
    email: inviteDto.email,
    password: tempPassword,
    firstName: inviteDto.name.split(' ')[0] || inviteDto.name,
    lastName: inviteDto.name.split(' ').slice(1).join(' ') || '',
    businessName: user.businessName,
    businessId: user.businessId,
    role: inviteDto.role === 'manager' ? 'manager' : 'apprentice',
    staffRole: inviteDto.role as any,
    status: 'invited',
  });
  await this.userRepo.save(newUser);

  // 3. Create TeamMember entity
  const teamMember = this.teamRepo.create({
    businessId: user.businessId,
    userId: newUser.id,
    name: inviteDto.name,
    role: inviteDto.role,
    permissions: inviteDto.permissions || [],
    department: inviteDto.department,
    status: 'invited',
    joinedDate: new Date(),
  });
  const savedMember = await this.teamRepo.save(teamMember);

  return {
    id: savedMember.id,
    email: newUser.email,
    name: savedMember.name,
    role: savedMember.role,
    status: savedMember.status,
    message: 'Invitation sent to email',
  };
}
```

---

## 5. Verification Checklist

- [ ] Non-owners and unauthorized staff cannot access `/api/team` management endpoints.
- [ ] Inviting a member creates both a `User` entity (with `businessId`) and a `TeamMember` entity.
- [ ] Member deletion is strictly restricted to `owner`.
- [ ] Permissions array updates take effect immediately in the database.
- [ ] `npm test team.service.spec.ts` passes.
