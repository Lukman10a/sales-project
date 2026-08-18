// Test bootstrap for the E2E suite.
//
// E2E tests boot the full AppModule, which initializes a TypeORM DataSource.
// Setting DB_MANUAL_INIT=true makes the DataSource construct without actually
// connecting to PostgreSQL, so the suite runs against a "dummy" database and
// requires no live database server.
process.env.NODE_ENV = 'test';
process.env.DB_MANUAL_INIT = 'true';
