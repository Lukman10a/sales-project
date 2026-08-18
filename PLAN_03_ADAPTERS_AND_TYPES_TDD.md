# Phase 3 — Adapters & Type Sync — TDD

**File:** `PLAN_03_ADAPTERS_AND_TYPES_TDD.md`
**Bucket 1.** Map raw backend responses to existing UI types so no page component changes. Plus the write-guards that keep Zod `.strict()` happy.
**All work in:** `sales-frontend/`. New folder `src/lib/adapters/`.

Per task: **RED** (`*.test.ts`, `npx vitest run <path>`, confirm failure) → **GREEN** → **VERIFY** (`npm run test`, then `npm run lint && npm run build`).

---

## 3.1 `src/lib/adapters/inventory.adapter.ts`

**Map (backend `InventoryItem` → frontend `InventoryItem`):**
- `wholesalePrice` / `sellingPrice`: Postgres `decimal` arrives as **string** → `Number()`. Round currency: `Math.round(n * 100) / 100`.
- `image`: pass through, default `""` when `null`.
- `lastRestocked`: backend `Date | null` → ISO string or `undefined`.
- `confirmedByApprentice`, `sold`, `status`: pass through.
- `category`: ensure `string[]` (normalise single-string → array, defensive).

**RED** — `inventory.adapter.test.ts`: string prices → numbers; `image: null` → `""`; `lastRestocked: null` → `undefined`; category normalised; decimal rounding to 2dp.

**GREEN** — implement.

**VERIFY** — targeted + full.

---

## 3.2 `src/lib/adapters/sale.adapter.ts`

**Map (backend `Sale` → frontend `SaleRecord`):**
- `time` ← `createdAt.toISOString()`
- `saleTimestamp` ← `new Date(createdAt).getTime()`
- `saleDate` ← `saleDate`
- `discount` ← `discountPercent`
- `total`, `status`, `paymentMethod`, `soldBy`, `customerName`, `customerId`, `refundAmount`, `refundReason`: pass through (numbers via `Number()`).
- `items`: list view has no items (Phase 1.6 only added `itemCount`) → `[]` until the detail is fetched via `GET /sales/:id` (which returns items with `productName` + `total`). Map detail items → `{ name: productName, quantity, price }` when present.

**RED** — `sale.adapter.test.ts`: fields mapped; list row with `itemCount` and no `items` → `items: []`; detail row with `items` → mapped with `name`; `discountPercent` → `discount`; decimal strings → numbers.

**GREEN** — implement.

**VERIFY** — targeted + full.

---

## 3.3 `src/lib/adapters/team.adapter.ts`

**Map (backend `TeamMember` → frontend `TeamMember`):**
- `email`: **real now** (Phase 1.7 join) — pass through.
- `role`, `status`, `permissions`, `department`: pass through.
- `joinedDate`: backend `Date` → ISO string.
- `lastActive`: not in backend → `undefined`.
- `invitedBy`: not in backend → `undefined`.

**RED** — `team.adapter.test.ts`: email passthrough; joinedDate ISO; `lastActive`/`invitedBy` are `undefined`; permissions array passthrough.

**GREEN** — implement.

**VERIFY** — targeted + full.

---

## 3.4 `notification.adapter.ts` + `notificationTypes.ts`

**Map (backend `Notification` → frontend `Notification`):**
- `time` ← `createdAt.toISOString()`
- `type`: backend includes `"system"` — frontend type must gain it.
- `read`, `title`, `message`, `metadata` (as `relatedItemId`/`actionType` heuristics when present): passthrough best-effort.

**RED**
- `notification.adapter.test.ts`: `createdAt` → `time`; type `"system"` accepted.
- Type-level: update `src/types/notificationTypes.ts` to `type: "inventory" | "sale" | "alert" | "ai" | "system"` and add optional `createdAt?: string`. Build fails until changed.

**GREEN** — implement adapter + edit the type.

**VERIFY** — targeted + full `npm run test`, `npm run lint && npm run build`.

---

## 3.5 `src/lib/adapters/profile.adapter.ts`

**Map (backend `{ user, profile, preferences }` → frontend `UserProfile` + `NotificationPreferences` + `AppearanceSettings`):**
- `name` ← `user.firstName + user.lastName`
- `joinedDate` ← `user.createdAt.toISOString()`
- `email`, `role` ← `user.email`, `user.role`
- `phone`, `company`, `address`, `city`, `country`, `bio` ← `profile.*`
- `avatar` ← `user.avatar`
- `notificationPreferences`: backend has no `sms` → default `false`; `push`/`email`/`lowStock`/`newSales`/`reports`/`teamActivity`/`aiInsights` passthrough.
- `appearanceSettings` ← `preferences.appearanceSettings`.

**RED** — `profile.adapter.test.ts`: name merge; `sms` defaults `false`; `push` passthrough; joinedDate ISO; missing profile fields → `undefined`.

**GREEN** — implement.

**VERIFY** — targeted + full.

---

## 3.6 `src/lib/adapters/analytics.adapter.ts`

**Map:**
- `GET /dashboard` → `{ metrics, inventory, topProducts, recentSales }` (numbers coerced).
- `GET /analytics/summary?period=...` → `{ current, previous, trends }`.
- `GET /analytics/sales-chart?period=...` → `{ unit, buckets }`.
- `GET /analytics/category-breakdown` and `GET /analytics/top-products` → the page's chart shapes.

**RED** — `analytics.adapter.test.ts`: `dashboard` envelope parsed; decimal strings → numbers; `summary` shape produced; `sales-chart` `unit`/`buckets` preserved.

**GREEN** — implement.

**VERIFY** — targeted + full.

---

## 3.7 Type sync: `teamTypes.ts` + `data/team.ts`

**Why:** frontend `Permission` union lacks 4 backend permissions; the mock `rolePermissions` map uses names that don't exist in the backend (`checkout-sales`, `view-out-of-stock`).

**RED (type-level)** — edit `src/types/teamTypes.ts` so `Permission` matches backend `TEAM_PERMISSIONS` exactly:
- Add: `record-sales`, `delete-products`, `edit-inventory`, `view-reports`.
- Keep `checkout-sales` and `view-out-of-stock` **only** as deprecated UI aliases (see 3.8 — they must never reach the API).
- Run `npm run build` → fails until `src/data/team.ts` `rolePermissions` and mock member `permissions` arrays are updated to use only valid names.

**GREEN**
- Update `src/data/team.ts` `rolePermissions` for each `TeamRole` using backend permission names (e.g. `sales-assistant: ["view-products", "record-sales"]`, `checkout: ["view-products", "record-sales"]`, `inventory: ["view-inventory", "edit-inventory"]`, manager adds `view-sales-history`, `assign-roles`, `view-reports`).
- Update mock member `permissions` arrays to the same valid names.

**VERIFY** — `npm run build` green; `npm run lint` green.

---

## 3.8 Write-guards (Zod `.strict()` protection)

Central helpers (new `src/lib/api/payloads.ts`, tested):

**RED** — `payloads.test.ts`:
- `toLoginPayload` / `toRegisterPayload`: strips `role` (regression guard for 2.3).
- `toProfileUpdate`: splits `name` → `firstName`/`lastName`; drops unknown keys.
- `toPreferencesUpdate`: strips `sms` from `notificationPreferences` (backend `UpdatePreferencesDtoSchema` is `.strict()` with no `sms`).
- `toTeamPermissions`: filters out deprecated aliases (`checkout-sales`, `view-out-of-stock`) leaving only backend-valid permissions (backend `z.enum(TEAM_PERMISSIONS)`).
- `toInventoryPayload` (Create/Update): passes `image/lastRestocked/confirmedByApprentice` through now that Phase 1.1 accepts them.

**GREEN** — implement the helpers.

**VERIFY** — targeted + full. These helpers are used by the context rewrites in Phase 4.

---

## Acceptance criteria (Phase 3)

1. `npm run build` passes with all adapters compiled; **no page component edits required**.
2. Every adapter has passing unit tests.
3. `teamTypes.ts` `Permission` is exactly the 9 backend permission names (plus the 2 documented UI-only aliases).
4. `payloads.ts` guarantees no `role`, `sms`, `name`, or deprecated permission values ever reach the API.

## Commit
Commit: `phase-3: adapters, type sync, write-guards`.