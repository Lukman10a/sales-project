# Phase 2 — Frontend API Layer & Auth — TDD

**File:** `PLAN_02_FRONTEND_API_LAYER_TDD.md`
**Bucket 1.** The frontend gains the infrastructure to talk to the backend: token store, typed client with single-flight refresh, auth endpoints, role mapping, middleware guard, and the `AuthService`/`AuthContext` rewrite.
**All work in:** `sales-frontend/`.

Per task: **RED** (`*.test.ts(x)`, run via `npx vitest run <path>`, confirm failure) → **GREEN** (implement) → **VERIFY** (`npm run test`, then `npm run lint && npm run build`).

**Testing rule:** all tests `vi.mock("@/lib/api/client")` — no real network. JWT decode tests use hand-built base64 tokens.

---

## 2.1 `src/lib/api/tokens.ts`

**Contract:**
- `localStorage` keys: `luxa_access_token`, `luxa_refresh_token`.
- Exports: `getAccessToken()`, `getRefreshToken()`, `setTokens(access, refresh)`, `clearTokens()`, `isTokenExpired(token): boolean` (decodes the JWT `exp` claim; treats missing/garbage as expired).
- Does **not** store the full user object (that stays in `AuthContext`).

**RED** — `src/lib/api/tokens.test.ts`:
- `setTokens` writes both keys; `getAccessToken` returns the access token.
- `clearTokens` removes both keys.
- `isTokenExpired` true for a token with `exp` in the past, false for future, true for malformed/undefined.

**GREEN** — implement `tokens.ts`. Handle SSR (`typeof window === "undefined"` → safe no-op).

**VERIFY** — targeted test green; `npm run test` green.

---

## 2.2 `src/lib/api/client.ts`

**Contract:**
- Base URL from `process.env.NEXT_PUBLIC_API_URL` (Phase 0 → `/api`).
- Sets `Content-Type: application/json`, `Accept: application/json`; injects `Authorization: Bearer <access>` when a token exists.
- **401 handling:** single-flight refresh — while a refresh is in flight, concurrent 401s queue and retry after it resolves. Refresh via `POST /auth/refresh` with `{ refreshToken }`; on success store new tokens and retry the original request; on failure `clearTokens()`.
- Non-2xx: parse `{ message, errors[] }` → throw `ApiError` with `message` and `errors` fields.
- Exports: `api.get<T>`, `api.post<T>`, `api.patch<T>`, `api.delete<T>`.

**RED** — `src/lib/api/client.test.ts` (mock global `fetch`, mock `tokens` module):
- Sends `Authorization` header when token present; none when absent.
- On 401 with a successful refresh: exactly **one** refresh call fires for N concurrent 401s (single-flight), then all N original requests retry with the new token.
- On refresh failure: tokens cleared, original request rejects, no infinite loop.
- Non-2xx JSON `{ message, errors }` → throws `ApiError` carrying both.
- 2xx parses JSON and returns `data`.

**GREEN** — implement `client.ts`.

**VERIFY** — targeted + full `npm run test`.

---

## 2.3 `src/lib/api/auth.ts`

**Contract:**
```
login(email, password)  → POST /auth/login    { email, password }          → AuthResponse
register(data)          → POST /auth/register { email, password, firstName, lastName, businessName } → AuthResponse
refresh()               → POST /auth/refresh  { refreshToken }             → { access_token, refresh_token }
logout()                → POST /auth/logout   (Bearer required)
getMe()                 → GET  /auth/me                                     → MeResponse
```

**CRITICAL — strip `role`.** Frontend `LoginCredentials`/`SignupData` include `role`; both backend DTOs are `.strict()` → 400. Never send it.

**RED** — `src/lib/api/auth.test.ts`:
- `login` sends a body **without** `role` (assert the mocked client received exactly `{ email, password }`).
- `register` sends a body **without** `role`; maps `{ access_token, refresh_token }` correctly.
- `getMe` returns the typed me payload.

**GREEN** — implement.

**VERIFY** — targeted + full test/lint/build.

---

## 2.4 `src/lib/api/roles.ts`

**Contract:**
- `backendRoleToUserRole(role)` mapping for the frontend `User.role` union:
  - `owner` → `owner`
  - `manager` → `apprentice` (with `staffRole = "manager"`)
  - `apprentice` → `apprentice`
- `mapAuthUser(backendUser)` → frontend `User` (id, email, firstName, lastName, role, staffRole, businessName, avatar). `staffRole` now comes from the backend (Phase 1 added it to login/me responses).
- `isInvestorEmail()`/investor handling: investor login attempt → abort with a friendly "Investor portal is coming soon" error.

**RED** — `src/lib/api/roles.test.ts`:
- `owner` maps to `role: "owner"`, `staffRole` preserved.
- Backend `manager` maps to `role: "apprentice"`, `staffRole: "manager"`.
- `mapAuthUser` fills `avatar` (default `""` when absent).
- Investor path throws the "coming soon" error.

**GREEN** — implement.

**VERIFY** — targeted + full.

---

## 2.5 `src/middleware.ts` rewrite

**Why:** middleware reads `luxa_auth` but nothing sets it and it never redirects. Wire login to set an **opaque marker cookie** (not the JWT); middleware redirects protected paths when it's absent. Real validation stays client-side.

**Tasks:**
1. **RED** — extract a pure, testable helper `src/lib/middleware-guard.ts` (or similar) exposing `shouldAllow(request)`: public routes (`/auth/*`) and `/api/*` always allowed; protected routes require the `luxa_auth` cookie. Test it in `middleware-guard.test.ts`.
2. **GREEN** — `src/middleware.ts` becomes a thin wrapper: `shouldAllow(request) ? NextResponse.next() : NextResponse.redirect(new URL("/auth/login", request.url))`. Keep the existing matcher (it already excludes `api`, `_next/*`, favicon, static assets).
3. **Cookie lifecycle** (client side, done in 2.6):
   - Login success: `document.cookie = "luxa_auth=1; path=/; SameSite=Lax"`
   - Logout: `document.cookie = "luxa_auth=; Max-Age=0; path="`

**VERIFY** — helper test green; manual: hitting `/dashboard` unauthenticated redirects to `/auth/login`.

---

## 2.6 `src/lib/auth.ts` `AuthService` rewrite + `AuthContext`

**Why:** `AuthService` is a mock (plaintext passwords, `MOCK_USERS`, localStorage sessions). Replace internals with real API calls; keep the public interface (`login/register/logout/updateUser/isAuthenticated/getLastRole`).

**RED** — `src/lib/auth.test.ts` (mock `@/lib/api/client`, `@/lib/api/auth`, `@/lib/api/tokens`):
- `login` calls `apiAuth.login` (role stripped), maps response via `roles.mapAuthUser`, stores tokens via `setTokens`, sets the `luxa_auth` cookie.
- `register` calls `apiAuth.register` (role stripped), auto-login the same way.
- `logout` calls `apiAuth.logout`, `clearTokens`, clears the cookie.
- Mock table + plaintext logic removed: no `luxa_registered_users`, no `MOCK_USERS`, `updateUser` no longer persists to localStorage.

**RED** — `src/contexts/AuthContext.test.tsx` (RTL):
- On mount with a valid stored token, `getMe()` is called and `user` is populated (firstName/lastName/avatar present — works because Phase 1.3 returned the full user).
- No reading of `luxa_auth_user` from localStorage.
- `login`/`register` redirect: non-investor → `/dashboard` **except** apprentices → `/sales` (see 4.x in Phase 4; implement redirect switch here: `user.role === "apprentice" ? "/sales" : "/dashboard"`).

**GREEN** — rewrite `AuthService` + `AuthContext` to use the new API modules and cookie lifecycle. Delete mock user table + plaintext password logic (`lib/auth.ts:34-86, 200-232`).

**Forms** (no tests required — UI polish):
- `LoginForm.tsx` / `SignupForm.tsx`: loading states on submit, backend error display (`ApiError.message` via `t()`), password hint (≥8 chars, upper + lower + digit — matches `RegisterDtoSchema`).
- `RoleToggle`: keep the visual toggle for UX but disable/intercept the investor option (it will always error with "coming soon").

**ProtectedRoute** (`src/components/ProtectedRoute.tsx`):
- **RED** — test that with no token `isAuthenticated` is false and redirect fires; with token and `requireRole` mismatch it redirects.
- **GREEN** — gate on token presence from `tokens.ts` (via `AuthContext`), keep `requireRole` behavior. Real token validation stays client-side.

**VERIFY** — full `npm run test`, `npm run lint`, `npm run build`.

---

## Acceptance criteria (Phase 2)

1. `api.post("/auth/login", { email, password })` against a running backend returns `access_token`/`refresh_token` (snake_case) with no 400.
2. Register → auto-login → apprentice lands on `/sales`, owner on `/dashboard`.
3. Wrong password surfaces the backend `message` in the form.
4. With `JWT_EXPIRES_IN=1m` locally, a 401 triggers a single refresh and the session survives.
5. Unauthenticated `/dashboard` request redirects to `/auth/login` via middleware.
6. No `luxa_auth_user` reads remain in `AuthContext`.

## Commit
Commit: `phase-2: frontend api layer (tokens, client refresh, auth api, roles, middleware, AuthService rewrite)`.