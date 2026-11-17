import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests across the real API and web app.
 *
 * Expects both apps to be built (`pnpm run build`) and a migrated Postgres
 * reachable through the backend env (CI: the `postgres` service). Set
 * E2E_REUSE_SERVERS=1 to test against servers you already started.
 */
const API_PORT = Number(process.env.E2E_API_PORT ?? 4000);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3000);
const reuse = !!process.env.E2E_REUSE_SERVERS;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // E2E_CHANNEL=msedge|chrome uses an installed browser instead of the
        // bundled Chromium (handy locally; CI uses the bundled one).
        channel: process.env.E2E_CHANNEL || undefined,
      },
    },
  ],
  webServer: [
    {
      command: 'node dist/main',
      cwd: '../apps/backend',
      url: `http://localhost:${API_PORT}`,
      reuseExistingServer: reuse,
      timeout: 60_000,
      env: { PORT: String(API_PORT) },
    },
    {
      command: `pnpm exec next start -p ${WEB_PORT}`,
      cwd: '../apps/web',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: reuse,
      timeout: 60_000,
    },
  ],
});
