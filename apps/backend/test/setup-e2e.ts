// Test bootstrap for the E2E suite.
//
// E2E tests boot the full AppModule, which initializes a TypeORM DataSource.
// Setting DB_MANUAL_INIT=true makes the DataSource construct without actually
// connecting to PostgreSQL, so the suite runs against a "dummy" database and
// requires no live database server.
//
// The env schema (src/config/env.schema.ts) refuses to boot without real
// values, so the suite supplies test-only ones. Real env vars win, which lets
// CI point the suite at a live Postgres later (T28/T29).
const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  DB_MANUAL_INIT: 'true',
  JWT_SECRET: 'e2e-access-secret-0123456789abcdefghij',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-0123456789abcdefghij',
  ENCRYPTION_KEY: 'ZTJlLWVuY3J5cHRpb24ta2V5LTAxMjM0NTY3ODlhYmM=',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/luxa_test',
  DATABASE_SSL: 'disable',
  FRONTEND_URL: 'http://localhost:3000',
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value;
}
process.env.NODE_ENV = 'test';
process.env.DB_MANUAL_INIT = 'true';
