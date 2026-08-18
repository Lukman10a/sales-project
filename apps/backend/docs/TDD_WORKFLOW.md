# TDD Workflow & Automated Check Suite

This document describes the Test-Driven Development (TDD) workflow for the LUXA Sales Backend and the automated checks that guard every change.

---

## 1. The Workflow (Red → Green → Refactor)

Every feature or fix follows the classic TDD cycle:

```
RED   → Write a failing unit test that expresses the desired behavior.
GREEN → Write the minimum implementation needed to make the test pass.
REFACTOR → Clean up the implementation while keeping all tests green.
```

### Red
- Author a `*.spec.ts` colocated with the unit you are about to build (e.g. `auth.service.spec.ts` next to `auth.service.ts`).
- The test should fail initially because the unit (or its method) does not exist yet.

### Green
- Implement the unit (`*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.guard.ts`, `*.strategy.ts`, `*.pipe.ts`) to satisfy the test.
- Run `npm test` to confirm the new test (and all existing tests) pass.

### Refactor
- Improve readability, tighten types, and remove duplication while re-running `npm test`.
- Run the full `npm run check` suite before finishing.

---

## 2. Test Parity (1:1)

A dedicated validator guarantees **every logic-layer source unit has a matching spec**:

- `scripts/require-tests.mjs`
- Covers: `*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.guard.ts`, `*.strategy.ts`, `*.pipe.ts`
- Run manually with `npm run check:tdd`, or as part of `npm run check`.

**Rule:** If you add a new service/controller/repository/guard/strategy/pipe, you **must** add its `*.spec.ts` in the same directory, or the check suite fails.

---

## 3. The Automated Check Suite

`npm run check` runs the full pipeline in order:

| Step            | Command                      | What it verifies                                   |
| --------------- | ---------------------------- | -------------------------------------------------- |
| Lint            | `npm run lint:check`         | Zero ESLint errors/warnings (type-safe rules)      |
| Typecheck       | `npm run typecheck`          | Zero TypeScript strict errors                      |
| Architecture    | `npm run arch`               | Zero dependency-cruiser violations (layer matrix)  |
| Test parity     | `npm run check:tdd`          | 100% 1:1 spec coverage for logic units             |
| Unit tests      | `npm test`                   | All unit specs pass                                |
| E2E tests       | `npm run test:e2e`           | All E2E specs pass (dummy database)                |
| Build           | `npm run build`              | Clean compilation                                  |

If any step fails, fix it before moving on — the pipeline stops at the first failure.

---

## 4. Git Hooks

- **`pre-commit`** runs `lint-staged` → lints and formats only the staged `.ts` files.
- **`pre-push`** runs the full `npm run check` suite.

Hooks are installed via `npm run prepare` (run automatically on `npm install`).

---

## 5. E2E & the Dummy Database

E2E tests boot the full `AppModule`. To avoid requiring a live PostgreSQL server:

- `test/setup-e2e.ts` sets `DB_MANUAL_INIT=true` before tests run.
- `src/database/database.config.ts` reads that flag into `manualInitialization`, so the TypeORM `DataSource` is **constructed but never connects** to the database.
- This keeps `npm run test:e2e` green in CI / local dev without a running database.

> Note: E2E tests that exercise real persistence still need a real database. When you add such tests, set `DB_MANUAL_INIT` to `false` (or unset it) for that suite and provide a reachable `DATABASE_*` config.

---

## 6. Validation Layer

All request bodies and query parameters are validated with **Zod** schemas:

1. Define a schema in `src/**/dto/*.ts`, e.g. `export const RegisterDtoSchema = z.object({ ... }).strict();`.
2. Export an inferred type: `export type RegisterDto = z.infer<typeof RegisterDtoSchema>;`.
3. Apply the reusable `ZodValidationPipe` in the controller:

   ```ts
   @Post('login')
   async login(@Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto) {
     // dto is fully validated & typed
   }
   ```

- `class-validator` / `class-transformer` are **not** used; do not reintroduce them.
