## Agent skills

### Issue tracker

Issues and specs for this repo live as GitHub issues in Lukman10a/sales-project, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Issues use the five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout: a `CONTEXT-MAP.md` at the repo root lists each context (currently `apps/backend`, `apps/web`), one `CONTEXT.md` per app, plus `docs/adr/`. See `docs/agents/domain.md`.

### Repository layout

Monorepo (pnpm workspaces + Turborepo). Work from the root; target an app with `--filter`.

- `apps/backend` — NestJS API (`@luxa/backend`). Full gate: `pnpm --filter @luxa/backend run check`.
- `apps/web` — Next.js app (`@luxa/web`). Gate: `pnpm --filter @luxa/web run check`.

Root commands: `pnpm install`, `pnpm run dev`, `pnpm run build`, `pnpm run lint`, `pnpm run check`, `pnpm run test`. Git hooks live at `.husky/` (`pre-push` runs `pnpm run check`).