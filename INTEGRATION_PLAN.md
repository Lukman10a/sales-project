# LUXA Sales â€” Frontend â†” Backend Integration Plan (Master Index)
**Last updated:** 2026-08-18 | **Verified against:** actual source files in both repos
**Status:** Awaiting execution. Each phase is a separate file under the repo root.

---

## Coverage model (3 buckets)

1. **Backend features not in the frontend â†’ prepare the frontend** â€” Phases 2â€“4 (API layer, adapters, context rewrites).
2. **Frontend features not in the backend â†’ create them in the backend** â€” Phase 1 (backend gaps, TDD).
3. **Connect and test everything** â€” Phase 5 (full test/build gates + smoke tests).

---

## Phase index

| Phase | File | Bucket | Goal | Depends on |
|---|---|---|---|---|
| 0 | `PLAN_00_ENV_AND_CONTRACT.md` | â€” | Env/CORS/rewrite, frontend test harness, API contract types | â€” |
| 1 | `PLAN_01_BACKEND_GAPS_TDD.md` | 2 | Complete the backend so every frontend feature has a real endpoint | 0 |
| 2 | `PLAN_02_FRONTEND_API_LAYER_TDD.md` | 1 | tokens, typed client (refresh), auth API, roles, middleware, AuthService rewrite | 0, 1 |
| 3 | `PLAN_03_ADAPTERS_AND_TYPES_TDD.md` | 1 | Adapter layer backend shapes â†’ UI shapes; type sync; write-guards | 1 |
| 4 | `PLAN_04_CONTEXT_REWRITES_TDD.md` | 1 | Contexts/pages â†’ React Query; routing fixes; cleanup | 2, 3 |
| 5 | `PLAN_05_CONNECT_AND_VERIFY.md` | 3 | Connect both apps; run full gates + smoke tests; document deferred items | all |

---

## Locked-in decisions

1. **Frontend adapts to backend.** NestJS is the contract of truth. Frontend gets a thin adapter layer so UI components change minimally.
2. **Core now, extras deferred.** Wire: auth, profile, inventory, sales (+ held), team, notifications, analytics/dashboard.
   Defer: investors, withdrawals, reports, data management, AI insights, activity logs, dashboard customisation.
3. **Investors stay fully mock** â€” no backend investor module exists. Block investor login with a friendly "coming soon" message.
4. **Direct backend contract.** `NEXT_PUBLIC_API_URL=http://localhost:4000`, backend on `:4000` with no `/api` prefix, no rewrite. `FRONTEND_URL` in the backend `.env` is updated anyway as a fallback.
5. **TDD is mandatory.** RED â†’ GREEN â†’ VERIFY for every task in Phases 1â€“4. Frontend gets a Vitest harness in Phase 0 (no test framework exists today).
6. **Required backend gaps only.** No new columns for `sms` (frontend strips it), `lastActive`, or `invitedBy` (frontend uses `undefined` placeholders).

---

## Verified facts from source (do not re-derive)

| Fact | Source |
|---|---|
| Backend runs on `:4000`, no `/api` prefix, CORS allows `http://localhost:3000` | `main.ts:9`, `.env.example:18` |
| Frontend is Next.js 15 (App Router), runs on `:3000` | `package.json`, `next.config.ts` |
| `@tanstack/react-query` v5 installed; `@tanstack/react-query-devtools` is **NOT** | `package.json:40` |
| `QueryClientProvider` mounted; `new QueryClient()` with zero config | `providers.tsx:18,21` |
| `InventoryItem` has `image`, `lastRestocked`, `confirmedByApprentice` columns | `inventory-item.entity.ts:49-53,71-72` |
| `Create/UpdateInventoryDtoSchema` are `.strict()` and missing those 3 fields | `create-inventory.dto.ts`, `update-inventory.dto.ts` |
| `InventoryService.create()/update()` do **not** persist `image/lastRestocked/confirmedByApprentice` even if the DTO allowed them | `inventory.service.ts:58-126` |
| `CreateSaleDto` is `.strict()` and missing `splitPayments`, `loyaltyPointsUsed`, `accountCredit` | `create-sale.dto.ts` |
| `SaleItem` has **no** `productName` or `total` | `sale-item.entity.ts` |
| Backend sales list does **not** eagerly load `items` | `sales.repository.ts:109-156` |
| `TeamMember` has **no** `email` column â€” only `userId` FK; `list()` does not join `User` | `team-member.entity.ts`, `team.repository.ts:73-104` |
| `TEAM_PERMISSIONS` = `view-products`, `edit-products`, `delete-products`, `view-sales-history`, `record-sales`, `view-inventory`, `edit-inventory`, `assign-roles`, `view-reports` | `team.constants.ts` |
| Frontend `Permission` union = `view-products`, `view-out-of-stock`, `edit-products`, `view-sales-history`, `checkout-sales`, `view-inventory`, `assign-roles` â€” out of sync | `teamTypes.ts:8-15` |
| `UpdatePermissionsDtoSchema` / `InviteMemberDtoSchema` validate with `z.enum(TEAM_PERMISSIONS)` â€” sending `checkout-sales`/`view-out-of-stock` returns 400 | `update-permissions.dto.ts`, `invite-member.dto.ts` |
| Backend `Notification.type` includes `"system"`; frontend does not | `notification.entity.ts:22-26`, `notificationTypes.ts:3` |
| `RegisterDto`/`LoginDto` have no `role`; registration always creates an `owner` | `register.dto.ts`, `login.dto.ts`, `auth.service.ts:43` |
| Frontend `LoginCredentials`/`SignupData` send `role` â†’ strict Zod 400 | `auth.ts:21,29`, `LoginForm.tsx:35`, `SignupForm.tsx:43-50` |
| Login/register responses use `access_token` / `refresh_token` (snake_case) | `auth.service.ts:167` |
| JWT payload + `CurrentUserPayload` have **no** `staffRole` | `jwt-payload.interface.ts`, `jwt.strategy.ts:18-26` |
| `GET /auth/me` returns only the JWT payload â€” no `firstName/lastName/avatar` | `auth.controller.ts:100-104` |
| Middleware reads `luxa_auth` cookie; **nothing ever sets it**; all routes fall through | `middleware.ts:13,22` |
| `DataContext.tsx` exists but is unmounted â€” dead file | `contexts/DataContext.tsx`, `providers.tsx` |
| Frontend `UserProfile.notificationPreferences` has `sms`; backend does not | `profileTypes.ts:19`, `user-profile.entity.ts:43-63` |
| `UpdatePreferencesDtoSchema` notificationPreferences is `.strict()` with no `sms` â†’ sending `sms` = 400 | `update-preferences.dto.ts:3-13` |
| `UpdateProfileDtoSchema` has no `name` â€” must send `firstName`/`lastName` | `update-profile.dto.ts` |
| `SaleRecord.items` stores `{ name, quantity, price }`; `SaleItem` stores only `productId/quantity/price` | `salesTypes.ts:21`, `sale-item.entity.ts` |
| `GET /sales` returns `{ data, pagination, summary }` â€” sales adds a `summary` field | `sales.repository.ts:146-155` |
| Avatar stored as base64/data-url string in `User.avatar`; `POST /profile/avatar` expects `{ dataUrl }` | `user.entity.ts:47-48`, `update-avatar.dto.ts` |
| All analytics + `/dashboard` endpoints are `@Roles('owner','manager')`; `refund` too | `analytics.controller.ts`, `sales.controller.ts:134-136` |
| Post-login redirect sends everyone non-investor to `/dashboard` â†’ apprentices will 403 | `AuthContext.tsx:60` |
| Frontend has stale Vite files excluded by tsconfig (`index.html`, `src/main.tsx`, `App.tsx`, `vite-env.d.ts`) | `tsconfig.json:26` |
| Backend gate: `npm run check` = lint:check + typecheck + arch + check:tdd + jest + e2e + build | `package.json:20` |
| Frontend has **no** test framework/script | `package.json:5-10` |

---

## TDD conventions (apply to every task in Phases 1â€“4)

Each task follows a strict RED â†’ GREEN â†’ VERIFY loop:

1. **RED** â€” Write the failing test first.
   - Backend: colocated `*.spec.ts` (jest, already configured). Run only that file: `npx jest <path> --runInBand`.
   - Frontend: colocated `*.test.ts(x)` (Vitest â€” harness added in Phase 0). Run only that file: `npx vitest run <path>`.
   - Assert the test fails for the right reason (feature missing, not a broken harness).
2. **GREEN** â€” Write the minimal implementation to make that test pass. Run the same targeted test.
3. **VERIFY** â€” Run the full gate for the affected repo:
   - Backend: `npm test` then `npm run check` (includes `check:tdd` which fails if any source file lacks a spec â€” so never delete spec files).
   - Frontend: `npm run test` then `npm run lint && npm run build`.

**Frontend test strategy:** Vitest + jsdom + @testing-library/react. The `src/lib/api` client is `vi.mock`-ed in every test; no network calls, no MSW. Component/context tests render providers with mocked api responses.

---

## Risks & notes

| Risk | Mitigation |
|---|---|
| Next.js middleware vs localStorage | Opaque `luxa_auth` cookie for redirect UX only. Real auth is token-based, client-side. |
| Refresh token concurrency | Single-flight refresh with queued retries in `client.ts`. |
| Money precision | Postgres `decimal` â†’ string in JSON. Adapters call `Number()` then `Math.round(n * 100) / 100`. |
| Zod strict DTOs | Every unknown field = 400. Write-guards in Phase 3: strip `role`, `sms`, deprecated permission aliases, `name`â†’`firstName/lastName`. |
| Apprentice 403s | `GET /dashboard` + analytics + refund are owner/manager only. Apprentices land on `/sales`; analytics hidden; refund UI gated. |
| `staffRole` missing after auth rewrite | Phase 1 adds `staffRole` to the JWT + `/auth/me`. `roles.ts` reads it from the token payload. |
| `getMe()` returns no name/avatar | Phase 1 extends `/auth/me` to return the full user object. |
| React Query v5 breaking changes | `onError` global + `useQuery` callbacks removed. Use `QueryCache` events and `mutation.onError`. |
| `check:tdd` enforces specs | Every new source file needs a corresponding `*.spec.ts`. Never delete specs. |

---

## Deferred (not blocking â€” Phase 6 in old numbering)

Backend modules: **Investors** (auth, ROI), **Withdrawals** (approval workflow), **Reports** (PDF/CSV), **Data management** (backup/import/export), **AI insights**, **Activity logs**, **Dashboard customisation** persistence, notification producers for `alert`/`ai`/`system`, real **invite-acceptance** flow (invited staff cannot log in â€” guard the UI with a "pending activation" state), server-side **pagination** for inventory/sales contexts, `sms` preference persistence (frontend strips it), `lastActive`/`invitedBy` columns on `team_members`.

---

## Repository hygiene

- This is now a single monorepo: `apps/backend/` and `apps/web/` are subtree grafts with preserved histories. Use pnpm at the root — `pnpm install`, `pnpm run build`, and per-app gates via `pnpm --filter @luxa/backend run check` / `pnpm --filter @luxa/web run check`. Commit after each phase's VERIFY step with a descriptive message. Never commit secrets (`.env` is gitignored; use `.env.local`/`.env.example` patterns).