# PLAN-000: Foundational Architecture & Shared Guardrails

- **Module**: Shared Infrastructure & Core Security
- **Specification Reference**: [`SPEC-001 Section 2: Multi-Tenancy & Authentication Context`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#2-multi-tenancy--authentication-context)
- **Status**: ✅ Implemented

---

## 1. Objectives

1. Embed `businessId` in the `User` entity and JWT token payload.
2. Establish custom NestJS decorators (`@CurrentUser()`, `@Roles()`, `@RequirePermissions()`).
3. Implement reusable `RolesGuard` and `PermissionsGuard` with automatic owner bypass.
4. Establish shared pagination DTOs and result interfaces.
5. Register `@nestjs/event-emitter` (`EventEmitterModule.forRoot()`) globally in `AppModule`.

---

## 2. Files to Create & Modify

```
src/
├── entities/
│   └── user.entity.ts                               # [MODIFY] Add businessId column
├── auth/
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts                 # [MODIFY] Add businessId & permissions
│   ├── jwt.strategy.ts                              # [MODIFY] Extract businessId & permissions
│   └── auth.service.ts                              # [MODIFY] Populate businessId on register
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts                # [NEW] @CurrentUser()
│   │   ├── roles.decorator.ts                       # [NEW] @Roles(...)
│   │   └── permissions.decorator.ts                 # [NEW] @RequirePermissions(...)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                        # [NEW] Standardized JWT guard
│   │   ├── roles.guard.ts                           # [NEW] Roles evaluation + owner bypass
│   │   └── permissions.guard.ts                     # [NEW] Permissions evaluation + owner bypass
│   ├── dto/
│   │   └── pagination-query.dto.ts                  # [NEW] Pagination params DTO
│   └── interfaces/
│       └── paginated-result.interface.ts            # [NEW] Envelope interface
└── app.module.ts                                    # [MODIFY] Import EventEmitterModule
```

---

## 3. Implementation Steps

1. **Install Dependencies**:
   ```bash
   npm install @nestjs/event-emitter csv-parse
   npm install -D @types/multer
   ```
2. **Update User Entity**: Add `businessId?: string` column (type UUID, nullable for backwards compatibility).
3. **Update Auth Module**:
   - Update `JwtPayload` to include `businessId: string` and optional `permissions?: string[]`.
   - Update `AuthService.register()`: For new owner registrations, if `businessId` is not provided, set `businessId = user.id`.
   - Update `AuthService.generateTokens()`: Embed `businessId` and `permissions` in the signed JWT.
   - Update `JwtStrategy.validate()`: Pass `{ id, email, role, businessName, businessId, permissions }` into `req.user`.
4. **Create Common Decorators**:
   - `@CurrentUser()` to extract `req.user`.
   - `@Roles(...roles: string[])` using `SetMetadata('roles', roles)`.
   - `@RequirePermissions(...permissions: string[])` using `SetMetadata('permissions', permissions)`.
5. **Create Common Guards**:
   - `RolesGuard`: Read metadata, check if `req.user.role === 'owner'` (allow), otherwise check if `roles.includes(req.user.role)`.
   - `PermissionsGuard`: Read metadata, check if `req.user.role === 'owner'` (allow), otherwise verify `user.permissions` contains required permissions.
6. **Register Event Emitter**: Add `EventEmitterModule.forRoot()` in `app.module.ts`.

---

## 4. Verification Checklist

- [x] `User` entity compiles with `businessId`.
- [x] Registered users receive JWT containing `businessId`.
- [x] `@Roles()` blocks unauthorized roles and allows `owner`.
- [x] `@RequirePermissions()` blocks missing permissions and allows `owner`.
- [x] Code compiles with 0 TypeScript errors (`npm run build`).

> **Note**: Team-member granular permissions are deferred to Phase 7. Owner JWTs embed the full permission list; other roles embed an empty list until team permissions are wired up.
