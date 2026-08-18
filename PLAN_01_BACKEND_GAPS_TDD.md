# Phase 1 — Backend Gaps (Frontend Features → Backend) — TDD

**File:** `PLAN_01_BACKEND_GAPS_TDD.md`
**Bucket 2.** Every frontend feature that has no backend implementation gets one now, so Phases 2–4 build against a complete contract.
**All work in:** `sales-backend/`.

Per task: **RED** (write failing `*.spec.ts`, run it, confirm it fails) → **GREEN** (implement) → **VERIFY** (`npm test`, then `npm run check`). Never delete a spec file — `npm run check:tdd` enforces their existence.

---

## 1.1 Inventory: persist `image`, `lastRestocked`, `confirmedByApprentice`

**Why (B2):** The entity has the columns but the DTOs reject them AND `InventoryService.create()/update()` never copy them — adding DTO fields alone would silently drop data. Both sides must change.

**RED**
- `src/inventory/inventory.service.spec.ts`: add tests
  - `create()` with `image`, `lastRestocked`, `confirmedByApprentice` returns an item with those values persisted.
  - `update()` setting `confirmedByApprentice`/`image` persists them and recalculates `status`.
- Run `npx jest inventory.service.spec --runInBand` → fails (fields dropped).

**GREEN**
- `src/inventory/dto/create-inventory.dto.ts` — add:
  ```ts
  image: z.string().optional(),
  lastRestocked: z.coerce.date().optional(),
  confirmedByApprentice: z.boolean().optional(),
  ```
- `src/inventory/dto/update-inventory.dto.ts` — add the same three fields (each `.optional()`).
- `src/inventory/inventory.service.ts`:
  - `create()`: copy `image`, `lastRestocked`, `confirmedByApprentice` into the item before save.
  - `update()`: copy them when defined; recalc `status` (already done).

**VERIFY** — `npm test` green; `npm run check` green.

---

## 1.2 Auth: `staffRole` in JWT + `CurrentUserPayload`

**Why (B1):** The frontend permission system reads `user.staffRole`. Today it lives only on the `User` entity and is never emitted — after the auth rewrite every apprentice would appear staffRole-less and lose all permissions.

**RED**
- `src/auth/jwt.strategy.spec.ts`: add test — `validate()` maps a payload containing `staffRole` into `CurrentUserPayload.staffRole`.
- `src/auth/auth.service.spec.ts`: add test — `generateTokens()` (via `register`/`login`) includes `staffRole` in the access token payload for a staff user.
- Run both → fail.

**GREEN**
- `src/auth/interfaces/jwt-payload.interface.ts`: add `staffRole?: string`.
- `src/auth/auth.service.ts` `generateTokens()`: include `staffRole: user.staffRole`.
- `src/auth/jwt.strategy.ts` `validate()`: include `staffRole: payload.staffRole`.
- `src/common/interfaces/current-user-payload.interface.ts`: add `staffRole?: string`.

**VERIFY** — `npm test` green; `npm run check` green.

---

## 1.3 Auth: `GET /auth/me` returns the full user

**Why (B3):** `GET /auth/me` currently returns only the JWT payload (no `firstName/lastName/avatar`). `AuthContext` will hydrate the session from `/auth/me` in Phase 2 — it must return the complete user shape.

**RED**
- `src/auth/auth.controller.spec.ts`: add test — `GET /auth/me` returns `firstName`, `lastName`, `avatar` (not just the payload).
- Run → fail.

**GREEN**
- `src/auth/auth.service.ts`: add `async me(userId)` that loads the user via `UsersRepository.findById` and returns the same user shape as `login()` (id, email, firstName, lastName, businessName, businessId, role, avatar, staffRole).
- `src/auth/auth.controller.ts`: `getCurrentUser` calls `authService.me(user.id)` instead of returning the payload.

**VERIFY** — `npm test` green; `npm run check` green.

---

## 1.4 Sales: `SaleItem.productName` + `total` column

**Why (Gap #2):** `sale_items` stores only `productId/quantity/price`. Receipts/history cannot show product names. Recommended approach: resolve the name at creation time and persist it.

**RED**
- `src/sales/sales.repository.spec.ts` (or `sales.service.spec.ts`): add test — after `create()` a sale with a known product, the returned `items` include `productName` and a computed `total` (`price * quantity`).
- Run → fail.

**GREEN**
- `src/entities/sale-item.entity.ts`: add
  ```ts
  @Column()
  productName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;
  ```
  (Requires a small migration — see note below.)
- `src/sales/sales.repository.ts` `createSale()`: accept `productName` per item; set `productName` and `total = price * quantity` when creating `SaleItem` records.
- `src/sales/sales.service.ts` `create()`: pass `product.name` through for each item.

> **Migration note:** this repo has no migration runner configured — the schema is synced (TypeORM `synchronize`/scripts). Confirm how schema changes are applied (see `database.config.ts`) and add the columns to the DB the same way the other columns were added (documented in `PHASE1_COMPLETE.md`). Same applies to 1.5.

**VERIFY** — `npm test` green; `npm run check` green.

---

## 1.5 Sales: `splitPayments`, `loyaltyPointsUsed`, `accountCredit`

**Why (Gap #4):** `CreateSaleDtoSchema` is `.strict()` and the POS supports split payment / account credit natively. Extend the DTO + entity so the frontend can send these.

**RED**
- `src/sales/sales.service.spec.ts`: add test — `create()` with `splitPayments`, `loyaltyPointsUsed`, `accountCredit` returns a sale persisting them (no 400 from validation).
- Optionally a DTO-validation spec asserting unknown-field rejection still works for other fields.
- Run → fail.

**GREEN**
- `src/sales/dto/create-sale.dto.ts`: add
  ```ts
  splitPayments: z.array(z.object({ method: z.enum(['cash','card','transfer','account']), amount: z.number() })).optional(),
  loyaltyPointsUsed: z.number().int().min(0).optional(),
  accountCredit: z.number().min(0).optional(),
  ```
- `src/entities/sale.entity.ts`: add matching nullable columns (`jsonb` for `splitPayments`, numeric for the other two) and persist them in `sales.repository.ts createSale()` / `sales.service.ts create()`.

**VERIFY** — `npm test` green; `npm run check` green.

---

## 1.6 Sales: `itemCount` on `GET /sales` list

**Why (Gap #5):** The list query doesn't load `items`; without at least a count the sales history table shows every sale as having 0 items.

**RED**
- `src/sales/sales.repository.spec.ts`: add test — `list()` returns each sale with an `itemCount` matching its `sale_items` rows.
- Run → fail.

**GREEN**
- `src/sales/sales.repository.ts` `list()`: add a `COUNT(sale_item.id)` subquery grouped by `sale_id` and map it to `itemCount` on each row. Keep full `items` lazy via `GET /sales/:id` (already loads relations).

**VERIFY** — `npm test` green; `npm run check` green.

---

## 1.7 Team: `email` in `GET /team`

**Why (Gap #1):** `TeamMember` has no `email`; the team UI requires it. Join `User` on read — no migration.

**RED**
- `src/team/team.repository.spec.ts`: add test — `list()` returns members whose response includes `email` from the joined `User`.
- Run → fail.

**GREEN**
- `src/team/team.repository.ts` `list()`: `leftJoinAndSelect('team.user', 'user')` (or `addSelect('user.email')`) and return `email` on each member.

**VERIFY** — `npm test` green; `npm run check` green.

---

## Acceptance criteria (Phase 1)

1. `npm run check` (backend) is fully green after every task — each new source file has a spec.
2. Manual API smoke (curl against `npm run start:dev`):
   - Register owner → create inventory item **with `image`** → item returns `image`.
   - `GET /auth/me` returns `firstName`/`lastName`/`avatar`.
   - Access-token JWT payload contains `staffRole` when applicable.
   - Record a sale → `GET /sales/:id` items have `productName` + `total`; `GET /sales` rows have `itemCount`.
   - `POST /sales` with `splitPayments`/`loyaltyPointsUsed`/`accountCredit` returns 201 (not 400).
   - `GET /team` returns `email`.

## Commit
Commit: `phase-1: backend gaps (inventory image persistence, staffRole JWT, full /me, SaleItem name/total, split payments, sales itemCount, team email)`.