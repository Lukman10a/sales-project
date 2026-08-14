# PLAN-002: Phase 2 — User Profile Module Audit & Enhancements

- **Module**: User Profile & Settings
- **Specification Reference**: [`SPEC-001 Section 4.1: Phase 2 User Profile Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#41-phase-2-user-profile-module)
- **Status**: ⏳ Pending Implementation

---

## 1. Objectives

1. Audit existing `src/profile/` implementation against `SPEC-001`.
2. Implement `POST /api/profile/avatar` for avatar image uploads (multipart file / base64).
3. Ensure profile and user settings (notification preferences, appearance settings) are properly isolated by `userId`.
4. Create comprehensive unit tests (`profile.service.spec.ts`) validating all profile operations.
5. Update documentation and progress trackers (`PHASES.md`).

---

## 2. Files to Create & Modify

```
src/
└── profile/
    ├── dto/
    │   ├── update-profile.dto.ts                    # [AUDIT/MODIFY]
    │   ├── change-password.dto.ts                   # [AUDIT]
    │   └── update-preferences.dto.ts                # [AUDIT]
    ├── profile.controller.ts                        # [MODIFY] Add avatar upload endpoint
    ├── profile.service.ts                           # [MODIFY] Add uploadAvatar() method
    ├── profile.module.ts                            # [AUDIT]
    └── profile.service.spec.ts                      # [NEW] Unit test suite
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
   - Add `POST('avatar')` in `ProfileController` using `@UseInterceptors(FileInterceptor('file'))`.
   - In `ProfileService.uploadAvatar(userId, file)`, convert/save avatar to a data URL or local static path, update `User.avatar`, and return the updated avatar URL.
2. **Password Validation**:
   - Verify `currentPassword` matches using `bcrypt.compare`.
   - Ensure `newPassword` differs from `currentPassword` and meets strength requirements (min 8 chars, 1 uppercase, 1 number).
3. **Unit Tests (`profile.service.spec.ts`)**:
   - Test `getProfile` (returns profile, creates default if absent).
   - Test `updateProfile` (updates firstName/lastName in User and bio/phone/address in Profile).
   - Test `changePassword` (success case, invalid old password rejection, same password rejection).
   - Test `updatePreferences` (deep merge of notification preferences and appearance settings).
   - Test `uploadAvatar` (saves avatar URL properly).

---

## 5. Verification Checklist

- [ ] `GET /api/profile` returns full user profile and settings.
- [ ] `PATCH /api/profile` updates both `User` and `UserProfile` records.
- [ ] `POST /api/profile/change-password` verifies current password and securely re-hashes.
- [ ] `POST /api/profile/avatar` accepts file upload and updates user avatar.
- [ ] `npm test profile.service.spec.ts` passes with 100% assertions.
