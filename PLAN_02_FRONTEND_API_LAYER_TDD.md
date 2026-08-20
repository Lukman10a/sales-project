# Phase 2 â€” Frontend API Layer & Auth â€” TDD

**File:** `PLAN_02_FRONTEND_API_LAYER_TDD.md`
**Bucket 1.** The frontend gains the infrastructure to talk to the backend: token store, typed client with single-flight refresh, auth endpoints, role mapping, middleware guard, and the `AuthService`/`AuthContext` rewrite.
**All work in:** `apps/web/`.

Per task: **RED** (`*.test.ts(x)`, run via `npx vitest run <path>`, confirm failure) â†’ **GREEN** (implement) â†’ **VERIFY** (`npm run test`, then `npm run lint && npm run build`).

**Testing rule:** all tests `vi.mock("@/lib/api/client")` â€” no real network. JWT decode tests use hand-built base64 tokens.

---

## 2.1 `src/lib/api/tokens.ts`

**Contract:**
- `localStorage` keys: `luxa_access_token`, `luxa_refresh_token`.
- Exports: `getAccessToken()`, `getRefreshToken()`, `setTokens(access, refresh)`, `clearTokens()`, `isTokenExpired(token): boolean` (decodes the JWT `exp` claim; treats missing/garbage as expired).
- Does **not** store the full user object (that stays in `AuthContext`).

**RED** â€” `src/lib/api/tokens.test.ts`:
- `setTokens` writes both keys; `getAccessToken` returns the access token.
- `clearTokens` removes both keys.
- `isTokenExpired` true for a token with `exp` in the past, false for future, true for malformed/undefined.

**GREEN** â€” implement `tokens.ts`. Handle SSR (`typeof window === "undefined"` â†’ safe no-op).

**VERIFY** â€” targeted test green; `npm run test` green.

---

## 2.2 `src/lib/api/client.ts`

**Contract:**
- Base URL from `process.env.NEXT_PUBLIC_API_URL` (Phase 0 â†’ `http://localhost:4000`).
- Sets `Content-Type: application/json`, `Accept: application/json`; injects `Authorization: Bearer <access>` when a token exists.
- **401 handling:** single-flight refresh â€” while a refresh is in flight, concurrent 401s queue and retry after it resolves. Refresh via `POST /auth/refresh` with `{ refreshToken }`; on success store new tokens and retry the original request; on failure `clearTokens()`.
- Non-2xx: parse `{ message, errors[] }` â†’ throw `ApiError` with `message` and `errors` fields.
- Exports: `api.get<T>`, `api.post<T>`, `api.patch<T>`, `api.delete<T>`.

**RED** â€” `src/lib/api/client.test.ts` (mock global `fetch`, mock `tokens` module):
- Sends `Authorization` header when token present; none when absent.
- On 401 with a successful refresh: exactly **one** refresh call fires for N concurrent 401s (single-flight), then all N original requests retry with the new token.
- On refresh failure: tokens cleared, original request rejects, no infinite loop.
- Non-2xx JSON `{ message, errors }` â†’ throws `ApiError` carrying both.
- 2xx parses JSON and returns `data`.

**GREEN** â€” implement `client.ts`.

**VERIFY** â€” targeted + full `npm run test`.

---

## 2.3 `src/lib/api/auth.ts`

**Contract:**
```
login(email, password)  â†’ POST /auth/login    { email, password }          â†’ AuthResponse
register(data)          â†’ POST /auth/register { email, password, firstName, lastName, businessName } â†’ AuthResponse
refresh()               â†’ POST /auth/refresh  { refreshToken }             â†’ { access_token, refresh_token }
logout()                â†’ POST /auth/logout   (Bearer required)
getMe()                 â†’ GET  /auth/me                                     â†’ MeResponse
```

**CRITICAL â€” strip `role`.** Frontend `LoginCredentials`/`SignupData` include `role`; both backend DTOs are `.strict()` â†’ 400. Never send it.

**RED** â€” `src/lib/api/auth.test.ts`:
- `login` sends a body **without** `role` (assert the mocked client received exactly `{ email, password }`).
- `register` sends a body **without** `role`; maps `{ access_token, refresh_token }` correctly.
- `getMe` returns the typed me payload.

**GREEN** â€” implement.

**VERIFY** â€” targeted + full test/lint/build.

---

## 2.4 `src/lib/api/roles.ts`

**Contract:**
- `backendRoleToUserRole(role)` mapping for the frontend `User.role` union:
  - `owner` â†’ `owner`
  - `manager` â†’ `apprentice` (with `staffRole = "manager"`)
  - `apprentice` â†’ `apprentice`
- `mapAuthUser(backendUser)` â†’ frontend `User` (id, email, firstName, lastName, role, staffRole, businessName, avatar). `staffRole` now comes from the backend (Phase 1 added it to login/me responses).
- `isInvestorEmail()`/investor handling: investor login attempt â†’ abort with a friendly "Investor portal is coming soon" error.

**RED** â€” `src/lib/api/roles.test.ts`:
- `owner` maps to `role: "owner"`, `staffRole` preserved.
- Backend `manager` maps to `role: "apprentice"`, `staffRole: "manager"`.
- `mapAuthUser` fills `avatar` (default `""` when absent).
- Investor path throws the "coming soon" error.

**GREEN** â€” implement.

**VERIFY** â€” targeted + full.

---

## 2.5 `src/middleware.ts` rewrite

**Why:** middleware reads `luxa_auth` but nothing sets it and it never redirects. Wire login to set an **opaque marker cookie** (not the JWT); middleware redirects protected paths when it's absent. Real validation stays client-side.

**Tasks:**
1. **RED** â€” extract a pure, testable helper `src/lib/middleware-guard.ts` (or similar) exposing `shouldAllow(request)`: public routes (`/auth/*`) and `/api/*` always allowed; protected routes require the `luxa_auth` cookie. Test it in `middleware-guard.test.ts`.
2. **GREEN** â€” `src/middleware.ts` becomes a thin wrapper: `shouldAllow(request) ? NextResponse.next() : NextResponse.redirect(new URL("/auth/login", request.url))`. Keep the existing matcher (it already excludes `api`, `_next/*`, favicon, static assets).
3. **Cookie lifecycle** (client side, done in 2.6):
   - Login success: `document.cookie = "luxa_auth=1; path=/; SameSite=Lax"`
   - Logout: `document.cookie = "luxa_auth=; Max-Age=0; path="`

**VERIFY** â€” helper test green; manual: hitting `/dashboard` unauthenticated redirects to `/auth/login`.

---

## 2.6 `src/lib/auth.ts` `AuthService` rewrite + `AuthContext`

**Why:** `AuthService` is a mock (plaintext passwords, `MOCK_USERS`, localStorage sessions). Replace internals with real API calls; keep the public interface (`login/register/logout/updateUser/isAuthenticated/getLastRole`).

**RED** â€” `src/lib/auth.test.ts` (mock `@/lib/api/client`, `@/lib/api/auth`, `@/lib/api/tokens`):
- `login` calls `apiAuth.login` (role stripped), maps response via `roles.mapAuthUser`, stores tokens via `setTokens`, sets the `luxa_auth` cookie.
- `register` calls `apiAuth.register` (role stripped), auto-login the same way.
- `logout` calls `apiAuth.logout`, `clearTokens`, clears the cookie.
- Mock table + plaintext logic removed: no `luxa_registered_users`, no `MOCK_USERS`, `updateUser` no longer persists to localStorage.

**RED** â€” `src/contexts/AuthContext.test.tsx` (RTL):
- On mount with a valid stored token, `getMe()` is called and `user` is populated (firstName/lastName/avatar present â€” works because Phase 1.3 returned the full user).
- No reading of `luxa_auth_user` from localStorage.
- `login`/`register` redirect: non-investor â†’ `/dashboard` **except** apprentices â†’ `/sales` (see 4.x in Phase 4; implement redirect switch here: `user.role === "apprentice" ? "/sales" : "/dashboard"`).

**GREEN** â€” rewrite `AuthService` + `AuthContext` to use the new API modules and cookie lifecycle. Delete mock user table + plaintext password logic (`lib/auth.ts:34-86, 200-232`).

**Forms** (no tests required â€” UI polish):
- `LoginForm.tsx` / `SignupForm.tsx`: loading states on submit, backend error display (`ApiError.message` via `t()`), password hint (â‰¥8 chars, upper + lower + digit â€” matches `RegisterDtoSchema`).
- `RoleToggle`: keep the visual toggle for UX but disable/intercept the investor option (it will always error with "coming soon").

**ProtectedRoute** (`src/components/ProtectedRoute.tsx`):
- **RED** â€” test that with no token `isAuthenticated` is false and redirect fires; with token and `requireRole` mismatch it redirects.
- **GREEN** â€” gate on token presence from `tokens.ts` (via `AuthContext`), keep `requireRole` behavior. Real token validation stays client-side.

**VERIFY** â€” full `npm run test`, `npm run lint`, `npm run build`.

---

## Acceptance criteria (Phase 2)

1. `api.post("/auth/login", { email, password })` against a running backend returns `access_token`/`refresh_token` (snake_case) with no 400.
2. Register â†’ auto-login â†’ apprentice lands on `/sales`, owner on `/dashboard`.
3. Wrong password surfaces the backend `message` in the form.
4. With `JWT_EXPIRES_IN=1m` locally, a 401 triggers a single refresh and the session survives.
5. Unauthenticated `/dashboard` request redirects to `/auth/login` via middleware.
6. No `luxa_auth_user` reads remain in `AuthContext`.

## Commit
Commit: `phase-2: frontend api layer (tokens, client refresh, auth api, roles, middleware, AuthService rewrite)`.