# Phase 0 — Environment & Contract Alignment

**File:** `PLAN_00_ENV_AND_CONTRACT.md`
**Goal:** Align ports/CORS, wire the dev proxy, stand up the frontend test harness, and define the API contract types. Everything later depends on this.
**Commands live in:** `sales-backend/` and `sales-frontend/` (run each from its own directory).

---

## 0.1 Backend CORS fallback

**Why:** `main.ts:9` defaults CORS to `http://localhost:5173` (old Vite). The primary dev path is the Next.js rewrite (below) which never hits CORS, but keep the backend permissive as a fallback.

**Task:**
- In `sales-backend/.env` set `FRONTEND_URL=http://localhost:3000`.
- Do not touch `main.ts` logic.

**VERIFY (manual):** `npm run start:dev` in `sales-backend/`; a request from a browser on `:3000` to `http://localhost:3001/api` succeeds with credentials enabled.

---

## 0.2 Frontend env + Next.js rewrite

**Why:** A relative base URL + server-side rewrite means the browser never makes cross-origin calls → no CORS, no preflight.

**Tasks:**
1. Create `sales-frontend/.env.local` (new, gitignored):
   ```
   NEXT_PUBLIC_API_URL=/api
   ```
   > Do **not** use `http://localhost:3001/api` — that would bypass the rewrite and re-introduce CORS. (This corrects the original plan's B6.)
2. Edit `sales-frontend/next.config.ts` — add a `rewrites()` export:
   ```ts
   async rewrites() {
     return [{ source: "/api/:path*", destination: "http://localhost:3001/api/:path*" }];
   }
   ```
   Keep existing config keys intact.

**VERIFY (manual, ordered):**
1. `npm run dev` in `sales-frontend/`.
2. `curl http://localhost:3000/api` → `{"Hello":"World"}` (proves rewrite + backend prefix work together).
3. Note: `src/middleware.ts` already excludes `/api` from its matcher — do not change that.

---

## 0.3 Frontend test harness (Vitest)

**Why:** The frontend has no test framework (`package.json` has only dev/build/start/lint). Strict red-green is impossible without one. Vitest is chosen for speed and zero config over the existing Vite-less Next setup.

**RED**
- Create `sales-frontend/src/lib/api/__tests__/harness.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  describe("test harness", () => { it("runs", () => { expect(true).toBe(true); }); });
  ```
- Run `npm run test` → fails (script does not exist). This is the RED.

**GREEN**
- Add devDependencies (install into `sales-frontend/`):
  - `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`
- Add `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react";
  import { fileURLToPath } from "node:url";

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  });
  ```
- Add `vitest.setup.ts` with `import "@testing-library/jest-dom/vitest";`.
- Add scripts to `package.json`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`

**VERIFY**
- `npm run test` → green (harness test passes).
- `npm run lint && npm run build` → still green.

---

## 0.4 API contract types

**Why:** One typed source of truth mirroring the backend envelopes so adapters (Phase 3) and client (Phase 2) compile against the real shapes.

**Task:** Create `sales-frontend/src/lib/api/types.ts` (new):

```ts
export interface ApiEnvelope<T> { data: T; pagination: Pagination; }

export interface Pagination { page: number; limit: number; total: number; pages: number; }

export interface ApiErrorBody { message: string | string[]; error?: string; statusCode?: number; errors?: Array<{ field?: string; message: string }>; }

export interface AuthUser {
  id: string; email: string; firstName: string; lastName: string;
  businessName: string; businessId: string; role: string; avatar?: string; staffRole?: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export interface SalesSummary { totalSales: number; totalTransactions: number; averageTransaction: number; }

// GET /api/sales adds `summary` on top of the standard envelope
export interface SalesListEnvelope<T> extends ApiEnvelope<T[]> { summary: SalesSummary; }

export interface RefreshResponse { access_token: string; refresh_token: string; }
export interface MeResponse { id: string; email: string; role: string; businessName: string; businessId: string; permissions?: string[]; staffRole?: string; }
```

> Note: `GET /api/sales` returns `{ data, pagination, summary }` — this is why `SalesListEnvelope` exists alongside `ApiEnvelope` (corrects original plan's "all envelopes are `{ data, pagination }`").

**VERIFY:** `npm run build` passes with the new module imported nowhere yet (or with a temporary import). Type-only task; confirmed by `tsc` via `next build`.

---

## Acceptance criteria (Phase 0)

1. `curl http://localhost:3000/api` returns `{"Hello":"World"}`.
2. `npm run test` in `sales-frontend/` runs Vitest and passes the harness test.
3. `sales-frontend/src/lib/api/types.ts` exists and compiles.
4. `npm run lint && npm run build` in `sales-frontend/` pass.

## Commit
Commit in both repos: `phase-0: env contract, rewrite, vitest harness, api types`.
