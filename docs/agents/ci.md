# CI and branch protection

All workflows live in `.github/workflows/` and run on pull requests to `main`
and on pushes to `main`.

| Check (job name) | Workflow | What it proves |
| --- | --- | --- |
| `ci` | `ci.yml` | `pnpm audit --prod --audit-level=high`; backend `check` (lint, typecheck, architecture, spec parity, unit, e2e incl. real-Postgres migration test, build); migrations complete (`migration:check` on a fresh DB); web `check` (tests, lint, typecheck, build) |
| `e2e` | `ci.yml` | Builds API and web, migrates a fresh Postgres, runs the Playwright smoke test (sign-up → dashboard). On failure the report and traces are uploaded as the `playwright-report` artifact. |
| `CodeQL` | `codeql.yml` | GitHub code scanning for JavaScript/TypeScript (`security-extended`), also weekly. |
| `gitleaks` | `gitleaks.yml` | Scans the full git history for committed secrets (`.gitleaks.toml`). |

CI services: Postgres 16 (both jobs) and Redis 7 (`ci`, for the queue work in T39).
Dependabot (`.github/dependabot.yml`) opens grouped weekly PRs for npm and GitHub Actions.

## Branch protection (manual, maintainer)

GitHub → Settings → Branches → add a rule for `main`:

- Require a pull request before merging.
- Require status checks to pass: **`ci`**, **`e2e`**, **`CodeQL`**, **`gitleaks`**.
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings.

## Running the same checks locally

```bash
pnpm --filter @luxa/backend run check
pnpm --filter @luxa/web run check
pnpm audit --prod --audit-level=high

# Real-Postgres backend e2e (the database is WIPED):
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/luxa_test \
  pnpm --filter @luxa/backend run test:e2e
```

Playwright smoke test (needs a migrated, disposable Postgres in the backend env):

```bash
pnpm --filter @luxa/backend run build
NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_API_URL=http://localhost:4100 pnpm --filter @luxa/web run build
cd e2e
pnpm exec playwright install chromium        # once
NEXT_DIST_DIR=.next-e2e E2E_API_PORT=4100 E2E_WEB_PORT=3100 \
FRONTEND_URL=http://localhost:3100 NODE_ENV=production \
DATABASE_URL=... DATABASE_SSL=disable JWT_SECRET=... JWT_REFRESH_SECRET=... ENCRYPTION_KEY=... \
  pnpm run test:e2e
```

`NEXT_DIST_DIR` keeps the e2e build apart from a running `next dev`; the port
variables avoid clashing with dev servers. `E2E_CHANNEL=msedge` (or `chrome`)
uses an installed browser instead of downloading Chromium.

## Dependency policy

- `pnpm-workspace.yaml` sets `minimumReleaseAge` to 14 days: new versions are
  only resolved once they have been public for two weeks.
- `overrides` there pin patched versions of vulnerable transitive packages.
- `auditConfig.ignoreGhsas` lists accepted advisories with the reason; each
  needs a removal condition.

## Secrets

gitleaks allowlists commit `9249576`, which committed `.env.original` with the
Supabase database password. Allowlisting does not make it safe: the password
must be rotated in Supabase (and the history optionally purged). Never commit
`.env*` files other than `.env.example`.
