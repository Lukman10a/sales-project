# PLAN-002: Phase 2 — User Profile Module Audit & Enhancements

- **Module**: User Profile & Settings
- **Specification Reference**: [`SPEC-001 Section 4.1: Phase 2 User Profile Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#41-phase-2-user-profile-module)
- **Status**: ✅ Implemented — core under PLAN-001 + `uploadAvatar` complete
- **Conventions**: This plan follows the guardrails from [`PLAN-001`](./PLAN-001-development-guardrails.md) and [`TDD_WORKFLOW.md`](../TDD_WORKFLOW.md). Every DTO is a **Zod schema + inferred type** applied via `ZodValidationPipe`; domain queries live in **colocated repositories**; every logic unit has a **colocated `*.spec.ts`**; the full gate is **`npm run check`**.

---

## 1. Objectives

1. Audit existing `src/profile/` implementation against `SPEC-001` (partially complete under PLAN-001).
2. Implement `POST /api/profile/avatar` for avatar image uploads (multipart file / base64).
3. Ensure profile and user settings (notification preferences, appearance settings) are properly isolated by `userId`.
4. Create comprehensive unit tests (`profile.service.spec.ts`, `profile.controller.spec.ts`, `user-profiles.repository.spec.ts`) validating all profile operations.
5. Update documentation and progress trackers (`PHASES.md`).

---

## 2. Files to Create & Modify

```
src/
└── profile/
    ├── dto/
    │   ├── update-profile.dto.ts                    # [IMPLEMENTED] Zod schema + inferred type
    │   ├── change-password.dto.ts                   # [IMPLEMENTED] Zod schema + inferred type
    │   ├── update-preferences.dto.ts                # [IMPLEMENTED] Zod schema + inferred type
    │   └── update-avatar.dto.ts                     # [IMPLEMENTED] Zod schema (base64 data URL)
    ├── user-profiles.repository.ts                  # [IMPLEMENTED] Colocated repository
    ├── profile.controller.ts                        # [IMPLEMENTED] Avatar upload endpoint added
    ├── profile.service.ts                           # [IMPLEMENTED] uploadAvatar() method added
    ├── profile.module.ts                            # [IMPLEMENTED] imports AuthModule + TypeOrmModule
    ├── profile.controller.spec.ts                   # [IMPLEMENTED] Unit test suite
    ├── profile.service.spec.ts                      # [IMPLEMENTED] Unit test suite
    └── user-profiles.repository.spec.ts             # [IMPLEMENTED] Unit test suite
```

**DTO pattern** (Zod, strict — no class-validator/class-transformer):

```typescript
import { z } from 'zod';

export const UpdateProfileDtoSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
}).strict();

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
```

Applied in the controller: `@Body(new ZodValidationPipe(UpdateProfileDtoSchema))`.

**Repository pattern** (colocated, extends `Repository<Entity>`):

```typescript
@Injectable()
export class UserProfileRepository extends Repository<UserProfile> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(UserProfile, dataSource.createEntityManager());
  }
  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.findOne({ where: { userId } });
  }
}
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/profile` | `JwtAuthGuard` | Fetch authenticated user profile & preferences |
| `PATCH` | `/api/profile` | `JwtAuthGuard` | Update user names and profile details |
| `POST` | `/api/profile/change-password` | `JwtAuthGuard` | Validate old password and update bcrypt hash |
| `PATCH` | `/api/profile/preferences` | `JwtAuthGuard` | Update JSON notification & appearance settings |
| `POST` | `/api/profile/avatar` | `JwtAuthGuard` | Upload and persist avatar image |

---

## 4. Implementation Steps

1. **Avatar Upload Endpoint**:
   - Add `POST('avatar')` in `ProfileController` with `@Body(new ZodValidationPipe(UpdateAvatarDtoSchema))`.
   - `UpdateAvatarDtoSchema` validates a base64 image **data URL** (`data:image/(jpeg|png|webp|gif|svg+xml);base64,...`, max 5MB).
   - In `ProfileService.uploadAvatar(userId, dto)`, persist the data URL to `User.avatar` via `UsersRepository` (injected from the imported `AuthModule`) and return the updated avatar URL.
2. **Password Validation**:
   - Verify `currentPassword` matches using `bcrypt.compare` (mocked in tests via `jest.mock('bcrypt', ...)`).
   - Ensure `newPassword` differs from `currentPassword` and meets strength requirements (min 8 chars, 1 uppercase, 1 number).
3. **Unit Tests (parity — one spec per logic unit)**:
   - `profile.service.spec.ts`: `getProfile` (returns profile, creates default if absent), `updateProfile` (updates firstName/lastName in User and bio/phone/address in Profile), `changePassword` (success, invalid old password, same password), `updatePreferences` (deep merge of notification + appearance), `uploadAvatar` (saves avatar URL properly, throws on missing user).
   - `profile.controller.spec.ts`: delegates to service with `@CurrentUser()` context and `ZodValidationPipe` schemas.
   - `user-profiles.repository.spec.ts`: `findByUserId` behavior.

---

## 5. Verification Checklist

- [x] `GET /api/profile` returns full user profile and settings.
- [x] `PATCH /api/profile` updates both `User` and `UserProfile` records.
- [x] `POST /api/profile/change-password` verifies current password and securely re-hashes.
- [x] `POST /api/profile/avatar` accepts a base64 image data URL and updates user avatar.
- [x] Test parity holds: `npm run check:tdd` reports 0 missing specs.
- [x] Full gate passes: `npm run check` (lint, typecheck, arch, parity, unit, e2e, build).
