# Phase 4 â€” Context & Page Rewrites (localStorage â†’ React Query + API) â€” TDD

**File:** `PLAN_04_CONTEXT_REWRITES_TDD.md`
**Bucket 1.** Every context/page keeps its current public interface so callers don't change â€” only internals swap to React Query + the API client.
**All work in:** `apps/web/`.

Per task: **RED** (context/component test via Vitest + RTL with `vi.mock("@/lib/api/client")`; confirm failure) â†’ **GREEN** â†’ **VERIFY** (`npm run test`, then `npm run lint && npm run build`).

**Shared pattern:** `useQuery` for reads, `useMutation` for writes, `queryClient.invalidateQueries` after mutations. Query keys: `["inventory"]`, `["sales"]`, `["held"]`, `["notifications"]`, `["team"]`, `["profile"]`, `["dashboard"]`, `["analytics"]`.

---

## 4.0 QueryClient defaults + providers

**RED** â€” `src/app/providers.test.tsx` (or a smoke test): assert the `QueryClient` is constructed with `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`.

**GREEN** â€” `src/app/providers.tsx`:
```ts
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      },
    }),
);
```

**VERIFY** â€” targeted + full.

---

## 4.1 `InventoryDataContext` rewrite

Endpoints (from `PLAN_01`/controllers):
| Operation | Endpoint |
|---|---|
| Read | `GET /inventory?limit=100` |
| Create | `POST /inventory` |
| Update | `PATCH /inventory/:id` |
| Delete | `DELETE /inventory/:id` |
| Decrement | `POST /inventory/:id/decrement` |
| Bulk import | `POST /inventory/bulk-import` (multipart â€” see note) |

- Phase-1 pagination: request `limit=100`, keep client-side filtering.
- After any mutation: invalidate `["inventory"]` and `["dashboard"]`.
- Keep computed `lowStock` / `outOfStock` / `totalItemsInStock` stats via existing `calculateStatus`-style helper.
- Send `image/lastRestocked/confirmedByApprentice` through `toInventoryPayload` (backend accepts them since 1.1).
- **Bulk import note:** the backend endpoint is multipart (`FileInterceptor`) â€” build `FormData` with a `file` field; keep the existing UI's parse-and-send behaviour.

**RED** â€” `src/contexts/InventoryDataContext.test.tsx` (RTL + mocked client):
- `useInventoryData().inventory` populated from `GET /inventory` envelope `{ data, pagination }` (adapted).
- `addInventoryItem` â†’ `POST` called, `["inventory"]` invalidated, state reflects response.
- `decrementInventory` â†’ `POST :id/decrement` with `{ quantity }`.
- `confirmInventoryReceipt` â†’ `PATCH` with `confirmedByApprentice: true`.
- **No `localStorage.getItem("luxa_inventory")` reads remain.**

**GREEN** â€” rewrite context internals.

**VERIFY** â€” targeted + full.

---

## 4.2 `SalesDataContext` rewrite

Endpoints:
| Operation | Endpoint |
|---|---|
| Record sale | `POST /sales` |
| Sales history | `GET /sales` |
| Single sale | `GET /sales/:id` |
| Refund | `PATCH /sales/:id/refund` |
| List held | `GET /sales/held` |
| Create held | `POST /sales/held` |
| Delete held | `DELETE /sales/held/:id` |

- Record sale payload (via `toSalePayload`): `{ items: [{ productId, quantity, price }], paymentMethod, discountPercent, customerName, customerId, saleDate }` plus `splitPayments/loyaltyPointsUsed/accountCredit` when present (backend accepts since 1.5).
- After recording: invalidate `["sales"]`, `["inventory"]`, `["dashboard"]`.
- List: adapt via `sale.adapter` (items `[]` + `itemCount`); detail fetches `GET /sales/:id` for items.

**RED** â€” `src/contexts/SalesDataContext.test.tsx`:
- `recentSales` from `GET /sales` (summary + envelope) adapted; `totalSalesAmount`/`totalItemsSold` computed from completed sales.
- `addSaleRecord` posts the mapped payload and invalidates `["sales"]`, `["inventory"]`, `["dashboard"]`.
- Held CRUD uses the `held` endpoints.
- **No `localStorage.getItem("luxa_sales")` reads remain.**

**GREEN** â€” rewrite context.

**VERIFY** â€” targeted + full.

---

## 4.3 `NotificationContext` rewrite

Endpoints:
| Operation | Endpoint |
|---|---|
| List | `GET /notifications` |
| Mark read | `PATCH /notifications/:id/read` |
| Mark all read | `POST /notifications/mark-all-read` |
| Delete | `DELETE /notifications/:id` |

- Consume `unreadCount` from the response envelope.
- Remove static `roleNotifications` seed data (`src/data/roleNotifications.ts` usage).

**RED** â€” `src/contexts/NotificationContext.test.tsx`:
- List populates notifications + `unreadCount`.
- Mark read / mark-all / delete call the right endpoints and invalidate `["notifications"]`.
- No seed data used when a list response exists.

**GREEN** â€” rewrite context.

**VERIFY** â€” targeted + full.

---

## 4.4 Team page (component state â†’ React Query)

Endpoints:
| Operation | Endpoint |
|---|---|
| List | `GET /team` |
| Invite | `POST /team` |
| Update | `PATCH /team/:id` |
| Update permissions | `PATCH /team/:id/permissions` |
| Remove | `DELETE /team/:id` |

- Replace local component state + `src/data/team.ts` fallback.
- **Permissions sent through `toTeamPermissions`** (deprecated aliases stripped â€” backend `z.enum` otherwise 400s).
- `GET /team` returns `email` (Phase 1.7) â€” display it.
- Activity log stays mock (deferred).

**RED** â€” `src/app/team/page.test.tsx` (or a `TeamList` component test):
- Renders members from `GET /team` with email + permissions.
- Invite posts with valid role/permissions only.
- Permission update strips deprecated aliases before PATCH.
- Remove calls `DELETE /team/:id`.

**GREEN** â€” implement.

**VERIFY** â€” targeted + full.

---

## 4.5 Profile page + `staff-profile`

Endpoints:
| Operation | Endpoint |
|---|---|
| Read | `GET /profile` |
| Update | `PATCH /profile` (via `toProfileUpdate` â€” `name` â†’ `firstName/lastName`) |
| Change password | `POST /profile/change-password` |
| Preferences | `PATCH /profile/preferences` (via `toPreferencesUpdate` â€” `sms` stripped) |
| Avatar | `POST /profile/avatar` `{ dataUrl }` (base64 data URL) |

- Merge `{ user, profile, preferences }` via `profile.adapter`.

**RED** â€” `src/app/profile/page.test.tsx`:
- Loads and renders merged profile (name = first+last).
- Save splits `name` and sends no unknown keys.
- Toggling `sms` does **not** send `sms` in the preferences PATCH (stripped).
- Avatar upload sends `{ dataUrl }`.

**GREEN** â€” implement (both the profile and staff-profile pages).

**VERIFY** â€” targeted + full.

---

## 4.6 Dashboard + analytics pages + apprentice routing

Endpoints:
| Endpoint | Used for |
|---|---|
| `GET /dashboard` | Overview metrics, inventory breakdown, top products, recent sales |
| `GET /analytics/summary?period=week` | Revenue summary + trends |
| `GET /analytics/sales-chart?period=week` | Chart data |
| `GET /analytics/category-breakdown?period=week` | Category revenue |
| `GET /analytics/top-products?period=week` | Top sellers |

- `GET /dashboard` + all analytics are `@Roles('owner','manager')` â†’ **apprentices get 403**. Guard the UI before making any API call (Phase 2 already routes apprentices to `/sales` on login; this phase hardens it):
  - Hide the dashboard/analytics nav + routes for apprentices (`role === "apprentice"` and no `view-reports`-style permission â†’ show an access-denied state instead of fetching).
  - **Refund** (`PATCH /sales/:id/refund`) is `owner|manager` only â€” gate the `RefundModal` with the same rule so `record-sales` staff don't hit 403s.

**RED** â€” `src/app/dashboard/page.test.tsx`:
- Owner renders live metrics from `GET /dashboard` (adapted).
- Apprentice sees an access-denied state and **no** `GET /dashboard` call is made.
- `src/components/sales/RefundModal` test: hidden/disabled for non-owner non-manager users.

**GREEN** â€” implement gating + analytics adapters (3.6) wiring.

**VERIFY** â€” targeted + full.

---

## 4.7 Cleanup

- Delete `src/contexts/DataContext.tsx` (unmounted dead file).
- Stop writing `luxa_inventory`, `luxa_sales`, `luxa_investors`, `luxa_withdrawals` localStorage keys (already covered by the rewrites; grep to confirm no writers remain).
- Keep `luxa_theme`, `luxa_appearance`, `luxa_language` (UI preferences â€” verified these keys are used).
- Delete stale Vite entry files (already excluded by `tsconfig.json:26`): `src/index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`. Confirm the app still builds after deletion.
- Mock data files in `src/data/` stay as fallback/seed only â€” do not delete.

**RED** â€” grep/CI-style test: no `localStorage` writes for the four data keys, no imports of `DataContext`.

**GREEN** â€” perform deletions; `npm run build` must pass.

**VERIFY** â€” full `npm run test && npm run lint && npm run build`.

---

## Acceptance criteria (Phase 4)

1. Fresh register â†’ create 3 products (with image) â†’ record a sale â†’ refund it â†’ dashboard reflects live data.
2. Restart the frontend; data persists (comes from the backend, not localStorage).
3. Apprentices: land on `/sales`, never see dashboard/analytics, can't open the refund modal.
4. Owner/manager: dashboard + analytics render live numbers.
5. `npm run test`, `npm run lint`, `npm run build` all green.

## Commit
Commit: `phase-4: context rewrites to react-query, routing guards, cleanup`.