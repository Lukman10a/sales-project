# Phase 5 â€” Connect & Verify Everything

**File:** `PLAN_05_CONNECT_AND_VERIFY.md`
**Bucket 3.** Connect both apps, run every gate, and prove the full user journey end-to-end. Any failure found here becomes a new RED â†’ fix â†’ GREEN cycle (add a regression test, then implement).

---

## 5.1 Full automated gates

### Backend (`apps/backend/`)
```bash
npm run check
```
Runs: `lint:check` + `typecheck` + `arch` (dependency-cruiser) + `check:tdd` (spec existence) + `test` (jest unit) + `test:e2e` (supertest) + `build`.

### Frontend (`apps/web/`)
```bash
npm run test
npm run lint
npm run build
```

All must pass with **zero warnings/errors**. `eslint` runs with `--max-warnings 0` on the backend â€” the frontend lint must be clean too.

---

## 5.2 Boot order for smoke tests

1. Start Postgres (see `apps/backend/.env` / `database.config.ts`).
2. Backend: `npm run start:dev` in `apps/backend/`.
3. Frontend: `npm run dev` in `apps/web/`.

---

## 5.3 Manual smoke tests (in order)

1. **Register owner** â†’ redirected to `/dashboard`, metrics are **live** (not mock data), display name shows firstName/lastName.
2. **Create inventory item with image** â†’ appears in the list; image persists after reload; `lastRestocked`/`confirmedByApprentice` round-trip.
3. **Record a sale in POS** â†’ stock decrements, a notification is created, dashboard revenue updates.
4. **Open a sale receipt** â†’ `GET /sales/:id` items show `productName` + `total`; the sales history list shows a real `itemCount` (not 0).
5. **Refund the sale (as owner)** â†’ stock restored, status `refunded`. As an apprentice, the refund button is not available (no 403).
6. **Held transaction**: create â†’ list â†’ delete.
7. **Team**: invite a member (valid role/permission names) â†’ member appears **with email**; assign permissions using backend names; a deprecated alias (`checkout-sales`) is silently stripped, not 400.
8. **Notifications**: mark one read, mark-all-read, delete; unread count badge updates.
9. **Profile**: update name/bio (name splits to first/last), change password (old password rejected), avatar upload (`dataUrl`), `sms` toggle does not 400.
10. **Apprentice login**: lands on `/sales`; dashboard/analytics routes show access-denied; no 403 toast from hidden API calls.
11. **Token refresh**: set `JWT_EXPIRES_IN=1m` (via `.env`) â†’ keep using the app past 1 minute â†’ session survives via single-flight refresh.
12. **Two-business isolation**: register a 2nd account; confirm zero cross-business data leakage (inventory/sales/team/notifications all scoped to `businessId`).
13. **Middleware guard**: clear cookies â†’ navigating to `/dashboard` redirects to `/auth/login`.
14. **Investor**: selecting "Investor" on login shows "coming soon" and aborts (no network call to a nonexistent module).

---

## 5.4 Fix loop

For any failure:
1. Write a failing regression test reproducing it (RED).
2. Fix the root cause (GREEN).
3. Re-run the full gate for the affected repo (VERIFY).
4. Re-run the smoke test.

Never "fix" a smoke failure without a regression test â€” the gates in 5.1 must stay green.

---

## 5.5 Rollback & safety

- Both repos are independent git repos with per-phase commits (`phase-0` â€¦ `phase-4`). A broken change is reverted with `git revert <commit>` or `git checkout <commit> -- <paths>`.
- `.env` / `.env.local` hold local secrets â€” never commit them.
- DB schema changes introduced in Phase 1 (SaleItem `productName`/`total`, Sale split-payment columns, inventory columns already present) follow the repo's existing schema-sync method (see `PHASE1_COMPLETE.md` / `database.config.ts`).

---

## 5.6 Explicitly deferred (out of scope â€” do not implement here)

Backend modules: **Investors** (auth, ROI), **Withdrawals** (approval workflow), **Reports** (PDF/CSV), **Data management** (backup/import/export), **AI insights**, **Activity logs**, **Dashboard customisation** persistence, notification producers for `alert`/`ai`/`system`, real **invite-acceptance** flow (guard UI with "pending activation" state instead), server-side **pagination** for inventory/sales contexts, `sms` preference persistence, `lastActive`/`invitedBy` columns on `team_members`.

## Commit
Commit: `phase-5: integration verification`.