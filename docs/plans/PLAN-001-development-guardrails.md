# PLAN-001: Development Guardrails & Automated Enforcement

- **Module**: Core Architecture, Tooling & Quality Assurance
- **Specification Reference**: [`docs/AGENTS.md`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/AGENTS.md), [`docs/specifications/SPEC-001-sales-backend-spec.md`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md)
- **Status**: ✅ Implemented

---

## 1. Objectives

1. **Module-Colocated Repository Layer**:
   - Establish dedicated repository classes colocated directly within their domain modules (`src/auth/users.repository.ts`, `src/profile/user-profiles.repository.ts`).
   - `AuthModule` provides and exports `UsersRepository`.
   - `ProfileModule` provides `UserProfileRepository` and imports `AuthModule` to use `UsersRepository`.
   - Decouple services from direct TypeORM `Repository` injection.
   - Enforce layer separation via `.dependency-cruiser.cjs` and ESLint `no-restricted-imports`.
2. **TypeScript Strictness & Type-Checked Linting**:
   - Enable full `"strict": true`, `"noImplicitAny": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, and switch-case/return checks in `tsconfig.json`.
   - Configure ESLint with error-level type-aware rules (`no-unsafe-*`, `no-floating-promises`, `no-explicit-any`).
   - Add definite assignment assertions (`!`) to required entity fields and eliminate implicit `any` across the codebase.
3. **Zod Validation Pipeline**:
   - Replace `class-validator` and `class-transformer` with standard, strictly typed Zod schemas.
   - Implement reusable `ZodValidationPipe` for request body and query parameter validation.
4. **TDD Workflow & Automated Check Suite**:
   - Enforce 1:1 test coverage parity between source units and unit tests (`scripts/require-tests.mjs`).
   - Install and configure Husky git hooks (`pre-commit` running `lint-staged`, `pre-push` running `npm run check`).
   - Provide clear documentation on the TDD workflow and agent guidelines.

---

## 2. Architecture & Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Client                            │
└──────────────────────────────┬──────────────────────────────┘
                               │ Request Body / Query Params
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                         │
│       (e.g., auth.controller.ts, profile.controller.ts)     │
│              (Validated via ZodValidationPipe)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Business Method Calls
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│         (e.g., auth.service.ts, profile.service.ts)         │
│        (Business Logic, Auth/Hashing, EventEmitter)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Domain Queries
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                         │
│     (e.g., users.repository.ts, user-profiles.repository.ts)│
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL Database (TypeORM)               │
└─────────────────────────────────────────────────────────────┘
```

### Layer Restriction Matrix
| File Pattern | Allowed Imports | Forbidden Imports |
|---|---|---|
| `*.controller.ts` | Services, DTOs, Guards, Decorators, Common Utils | Database drivers, TypeORM, Repositories, Entities |
| `*.service.ts` | Repositories, DTOs, Interfaces, EventEmitter | Direct TypeORM `Repository` injection, Raw DB drivers, Express objects |
| `*.repository.ts` | TypeORM, Entities, Database Config | Controllers, Guards, Services, HTTP Clients, Bcrypt, JWT, EventEmitter |
| `src/entities/*.ts`| TypeORM decorators, Sibling Entities | Services, Repositories, Controllers, Business logic |

---

## 3. Files to Create & Modify

```
.
├── .dependency-cruiser.cjs                            # [NEW] Architecture validation rules
├── .husky/
│   ├── pre-commit                                    # [NEW] Runs lint-staged
│   └── pre-push                                      # [NEW] Runs npm run check
├── scripts/
│   └── require-tests.mjs                             # [NEW] 1:1 unit test parity validator
├── docs/
│   ├── TDD_WORKFLOW.md                               # [NEW] TDD red-green-refactor guide
│   ├── AGENTS.md                                     # [MODIFY] Update with Zod, Repositories & Check scripts
│   └── plans/
│       └── PLAN-001-development-guardrails.md        # [NEW] This plan file
├── package.json                                      # [MODIFY] Scripts, dependencies, lint-staged & prepare
├── tsconfig.json                                     # [MODIFY] Full strict mode & unused flags
├── eslint.config.mjs                                 # [MODIFY] Error-level type safety & restricted imports
├── src/
│   ├── main.ts                                       # [MODIFY] Remove ValidationPipe, ensure clean bootstrap
│   ├── common/
│   │   ├── dto/
│   │   │   └── pagination-query.dto.ts               # [MODIFY] Convert to Zod schema
│   │   ├── pipes/
│   │   │   ├── zod-validation.pipe.ts                # [NEW] Zod validation pipe
│   │   │   └── zod-validation.pipe.spec.ts           # [NEW] Pipe unit test
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts             # [MODIFY] Type-safe CurrentUserPayload return
│   │   └── guards/
│   │       ├── roles.guard.spec.ts                   # [MODIFY] Type-safe mock execution context
│   │       └── permissions.guard.spec.ts             # [MODIFY] Type-safe mock execution context
│   ├── entities/
│   │   ├── user.entity.ts                            # [MODIFY] Definite assignment (!) on required fields
│   │   ├── user-profile.entity.ts                    # [MODIFY] Definite assignment (!)
│   │   ├── inventory-item.entity.ts                  # [MODIFY] Definite assignment (!)
│   │   ├── sale.entity.ts                            # [MODIFY] Definite assignment (!)
│   │   ├── sale-item.entity.ts                       # [MODIFY] Definite assignment (!)
│   │   ├── held-transaction.entity.ts                # [MODIFY] Definite assignment (!)
│   │   ├── notification.entity.ts                    # [MODIFY] Definite assignment & Record<string, unknown>
│   │   └── team-member.entity.ts                     # [MODIFY] Definite assignment (!)
│   ├── auth/
│   │   ├── auth.module.ts                            # [MODIFY] Provide & export UsersRepository; TypeOrmModule.forFeature([User])
│   │   ├── auth.controller.ts                        # [MODIFY] Zod validation pipe on body endpoints
│   │   ├── auth.controller.spec.ts                   # [NEW] Unit tests
│   │   ├── auth.service.ts                           # [MODIFY] Inject UsersRepository; strict typed tokens
│   │   ├── auth.service.spec.ts                      # [NEW] Unit tests
│   │   ├── jwt.strategy.ts                           # [MODIFY] Typed validate & ConfigService secret
│   │   ├── jwt.strategy.spec.ts                      # [NEW] Unit tests
│   │   ├── users.repository.ts                       # [NEW] Custom UsersRepository in auth/
│   │   ├── users.repository.spec.ts                  # [NEW] UsersRepository unit tests
│   │   └── dto/
│   │       ├── register.dto.ts                       # [MODIFY] Zod schema & inferred type
│   │       ├── login.dto.ts                          # [MODIFY] Zod schema & inferred type
│   │       └── refresh-token.dto.ts                  # [NEW] Zod schema for refresh token
│   └── profile/
│       ├── profile.module.ts                         # [MODIFY] Import AuthModule; provide UserProfileRepository; TypeOrmModule.forFeature([UserProfile])
│       ├── profile.controller.ts                     # [MODIFY] @CurrentUser() and Zod body pipes
│       ├── profile.controller.spec.ts                # [NEW] Unit tests
│       ├── profile.service.ts                        # [MODIFY] Inject UsersRepository + UserProfileRepository; typed field iteration
│       ├── profile.service.spec.ts                   # [NEW] Unit tests
│       ├── user-profiles.repository.ts               # [NEW] Custom UserProfileRepository in profile/
│       ├── user-profiles.repository.spec.ts          # [NEW] UserProfileRepository unit tests
│       └── dto/
│           ├── update-profile.dto.ts                 # [MODIFY] Zod schema & inferred type
│           ├── change-password.dto.ts                # [MODIFY] Zod schema & inferred type
│           └── update-preferences.dto.ts             # [MODIFY] Zod schema & inferred type
```

---

## 4. Phased Implementation Breakdown

### Phase 1 — Dependencies & TypeScript / Linter Strictness
1. **Dependencies**:
   - `npm install zod`
   - `npm install -D @types/passport-jwt @types/passport dependency-cruiser husky lint-staged`
   - `npm uninstall class-validator class-transformer`
2. **`tsconfig.json`**:
   - `"strict": true`, `"noImplicitAny": true`, `"strictBindCallApply": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noImplicitReturns": true`, `"noFallthroughCasesInSwitch": true`.
3. **`eslint.config.mjs`**:
   - Configure error levels for `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unsafe-*`, `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-unused-vars`.
   - Add ESLint import boundary rules restricting direct `typeorm` imports in services and controllers.
4. **Fix Existing Typings & Entity Definite Assignment**:
   - Add `!` to all non-optional columns across all 8 entity files.
   - Refactor `metadata?: Record<string, any>` to `Record<string, unknown>`.
   - Type `jwt.strategy.ts`, `current-user.decorator.ts`, and `main.ts`.

---

### Phase 2 — Zod Validation Engine
1. **`src/common/pipes/zod-validation.pipe.ts`**:
   - Custom `PipeTransform` validating against `ZodSchema`, throwing formatted `BadRequestException` on failures.
2. **DTO Migrations**:
   - Replace all `class-validator` DTOs with strict Zod schemas (`z.object({...}).strict()`) and export infer types.
   - Apply `@Body(new ZodValidationPipe(DtoSchema))` in controllers.

---

### Phase 3 — Repository Pattern & Architecture Rules
1. **Colocated Repositories**:
   - `src/auth/users.repository.ts`: `UsersRepository extends Repository<User>` with query helper methods (`findByEmail`, `findById`). Registered as a provider and exported in `AuthModule`.
   - `src/profile/user-profiles.repository.ts`: `UserProfileRepository extends Repository<UserProfile>` with `findByUserId`. Registered as a provider in `ProfileModule`.
2. **Service Refactoring**:
   - `AuthService` injects `UsersRepository`.
   - `ProfileService` injects `UsersRepository` and `UserProfileRepository`.
   - `ProfileModule` imports `AuthModule` to consume `UsersRepository`.
3. **Architecture Rules**:
   - `.dependency-cruiser.cjs` configured to prevent layer leaks (controllers/services cannot import direct TypeORM repository tokens or DB drivers, repositories must not contain business logic).

---

### Phase 4 — Test Automation, Checks & Git Hooks
1. **Automated Test Parity Script (`scripts/require-tests.mjs`)**:
   - Verify every `*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.guard.ts`, `*.strategy.ts`, and `*.pipe.ts` has a corresponding `*.spec.ts`.
2. **Author Unit Tests**:
   - Add unit specs for `UsersRepository`, `UserProfileRepository`, `AuthService`, `AuthController`, `JwtStrategy`, `ProfileService`, `ProfileController`, and `ZodValidationPipe`.
3. **Configure Package Scripts & Git Hooks**:
   - Configure `npm run check`: `npm run lint:check && npm run typecheck && npm run arch && npm run check:tdd && npm test && npm run test:e2e && npm run build`.
   - Setup Husky `pre-commit` (lint-staged) and `pre-push` (npm run check).
4. **Update Documentation**:
   - Create `docs/TDD_WORKFLOW.md` and update `docs/AGENTS.md`, `PHASES.md`, and `QUICK_REFERENCE.md`.

---

## 5. Verification Pipeline

- [x] `npm run lint:check` (0 ESLint errors/warnings)
- [x] `npm run typecheck` (0 TypeScript strict errors)
- [x] `npm run arch` (0 dependency violations)
- [x] `npm run check:tdd` (100% test parity)
- [x] `npm test` (all unit specs passing)
- [x] `npm run test:e2e` (all E2E specs passing)
- [x] `npm run build` (clean compilation)
- [x] Husky hooks active and verified.
