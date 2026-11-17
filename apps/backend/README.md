# LUXA Sales Backend - NestJS API

Backend API for the LUXA Sales Management System built with NestJS, TypeORM, and PostgreSQL.

## Project Structure

```
backend/
├── src/
│   ├── auth/                    # Authentication module (Phase 1)
│   │   ├── dto/                 # Data transfer objects
│   │   ├── interfaces/          # TypeScript interfaces
│   │   ├── auth.controller.ts   # Auth endpoints
│   │   ├── auth.service.ts      # Auth business logic
│   │   ├── auth.module.ts       # Auth module config
│   │   └── jwt.strategy.ts      # JWT Passport strategy
│   ├── database/                # Database configuration
│   │   └── database.config.ts
│   ├── entities/                # TypeORM entities
│   │   ├── user.entity.ts
│   │   ├── inventory-item.entity.ts
│   │   ├── sale.entity.ts
│   │   ├── sale-item.entity.ts
│   │   ├── held-transaction.entity.ts
│   │   ├── notification.entity.ts
│   │   └── team-member.entity.ts
│   ├── app.module.ts            # Root application module
│   └── main.ts                  # Application entry point
├── PHASES.md                    # Phase development tracking
├── PHASE1_TESTING.md            # Phase 1 testing guide
├── .env.example                 # Environment variables template
└── package.json
```

## Technology Stack

- **Framework:** NestJS v10+
- **Database:** PostgreSQL 15+ with TypeORM
- **Authentication:** JWT with Passport
- **Validation:** class-validator + class-transformer
- **Password Hashing:** bcrypt
- **API Documentation:** Swagger/OpenAPI (coming soon)

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ (or Docker)

### 2. Setup Database

After creating the database, apply the schema with `pnpm migration:run`
(and optionally `pnpm db:seed`).

Using Docker (recommended):

```bash
docker run -d \
  --name luxa-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=luxa_sales \
  -p 5432:5432 \
  postgres:15
```

Or install PostgreSQL locally and create database:

```bash
createdb luxa_sales
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`. At minimum set a database, two **different** JWT secrets of 32+ characters, and the frontend URL. Generate each secret with `openssl rand -base64 48`.

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/luxa_sales
DATABASE_SSL=disable
JWT_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<a different openssl rand -base64 48>
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

The API validates its environment at startup (`src/config/env.schema.ts`) and exits with a list of problems if anything is missing or unsafe. The placeholder secrets from `.env.example` are rejected on purpose.

### 5. Run Development Server

```bash
npm run start:dev
```

Server will start at: **http://localhost:4000**

## Development Phases

The backend is developed in incremental phases with comprehensive testing between each phase:

### ✅ Phase 1: Authentication Module (READY FOR TESTING)

**Endpoints:**

- `POST /auth/register` - Register new business account
- `POST /auth/login` - Authenticate user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user

**Testing Guide:** See [PHASE1_TESTING.md](./PHASE1_TESTING.md)

### ⏳ Phase 2: User Profile Module (Pending)

- User profile management
- Change password
- Update preferences

### ⏳ Phase 3: Inventory Module (Pending)

- Product CRUD operations
- Filtering and pagination
- Stock management
- Bulk import

### ⏳ Phase 4: Sales Module (Pending)

- Record sales transactions
- Sales history
- Refund processing
- Held transactions

### ⏳ Phase 5: Analytics Module (Pending)

- Dashboard metrics
- Sales charts
- Category breakdown
- Top products

### ⏳ Phase 6: Notifications Module (Pending)

- Notification system
- Mark as read
- Type filtering

### ⏳ Phase 7: Team Module (Pending)

- Team member management
- Role-based permissions
- Invite system

**Full progress tracking:** See [PHASES.md](./PHASES.md)

## Available Scripts

```bash
# Development
npm run start:dev          # Start dev server with hot reload

# Production
npm run build              # Build for production
npm run start:prod         # Start production server

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Test coverage

# Linting
npm run lint               # Run ESLint
npm run format             # Format with Prettier
```

## API Testing

### Using cURL

```bash
# Sessions are cookies, so keep them in a jar. Unsafe requests need an allowed
# Origin and, once signed in, the luxa_csrf cookie echoed as x-csrf-token.
# Register a new user
curl -c jar.txt -X POST http://localhost:4000/auth/register \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@business.com","password":"Password123!","firstName":"John","lastName":"Doe","businessName":"Prime Store"}'

# Login ("remember": trust this device for 30 days)
curl -c jar.txt -X POST http://localhost:4000/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@business.com","password":"Password123!","remember":true}'

# Get current user (sends the access cookie)
curl -b jar.txt http://localhost:4000/auth/me
```

### Using Postman

Import the Postman collection from [PHASE1_TESTING.md](./PHASE1_TESTING.md)

## Database Schema

### Current Entities (Phase 1)

**User Table:**

- Handles authentication and user accounts
- Supports owner, manager, and apprentice roles
- Bcrypt-hashed passwords
- JWT token-based authentication

**Future Entities (Phase 2-7):**

- InventoryItem
- Sale & SaleItem
- HeldTransaction
- Notification
- TeamMember

## Environment Variables

Validated at boot by `src/config/env.schema.ts`. The app will not start if a required value is missing or unsafe.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `production` | `development`, `test` or `production`. Only `development` auto-syncs the schema. |
| `PORT` | no | `4000` | |
| `JWT_SECRET` | **yes** | – | At least 32 characters. Placeholder values are rejected. |
| `JWT_REFRESH_SECRET` | **yes** | – | At least 32 characters and different from `JWT_SECRET`. Reserved: refresh tokens are opaque and no longer signed with it. |
| `JWT_EXPIRES_IN` | no | `15m` | Access token and access cookie lifetime. |
| `JWT_REFRESH_EXPIRATION` | no | `7d` | Unused. Session lifetimes are fixed, see [Sessions](#sessions). |
| `COOKIE_DOMAIN` | no | – | Parent domain for the `luxa_csrf` cookie, so the web app on `app.` can read the cookie set by `api.` (e.g. `luxa.app`). Leave unset locally. |
| `DATABASE_URL` | yes* | – | Postgres connection string. Takes precedence over the fields below. |
| `DATABASE_HOST` / `DATABASE_USERNAME` / `DATABASE_NAME` | yes* | – | *Either `DATABASE_URL` or these three are required. |
| `DATABASE_PORT` | no | `5432` | |
| `DATABASE_PASSWORD` | no | – | |
| `DATABASE_SSL` | no | `require` in production, `no-verify` in development, `disable` in test | `require` verifies the server certificate. `no-verify` encrypts without verifying and is **refused in production**. `disable` uses no TLS. |
| `DATABASE_CA` | no | – | PEM CA bundle for `require` when the provider uses a private CA (e.g. Supabase). |
| `DB_MANUAL_INIT` | no | – | `true` builds the DataSource without connecting (used by the e2e suite). |
| `FRONTEND_URL` | **yes** | – | Web app URL. Also the default CORS origin. |
| `CORS_ORIGINS` | no | origin of `FRONTEND_URL` | Comma-separated allowlist of exact origins, e.g. `https://luxa.app,https://app.luxa.app`. `*` is not accepted. |
| `LOG_LEVEL` | no | – | `debug` turns on SQL logging. |
| `AI_INSIGHTS_ENABLED` | no | `false` | AI narrative layer for insights. |
| `AI_PROVIDER_API_KEY` / `AI_MODEL` / `AI_BASE_URL` | no | `gpt-4o-mini` model | OpenAI-compatible provider settings. |
| `AI_INSIGHTS_DIGEST_CRON` | no | `0 7 * * *` | Daily digest schedule. |

### HTTP hardening

`src/bootstrap.ts` applies, in production and in the e2e suite:

- helmet security headers (API-only CSP `default-src 'none'`, HSTS, nosniff, frame protection)
- `trust proxy` set to one hop (for Railway/Vercel)
- a 1 MB limit on request bodies
- a CORS allowlist with credentials
- graceful shutdown hooks

## Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ Cookie sessions with rotating, revocable refresh tokens (see [Sessions](#sessions))
- ✅ CORS allowlist plus CSRF protection (Origin check and double-submit token)
- ✅ Business data isolation (users can only access their own data)
- ✅ Input validation with zod
- ✅ SQL injection protection via TypeORM parameterized queries
- 🔄 Rate limiting (coming in Phase 2)

### Sessions

| Cookie | Contents | Flags |
| --- | --- | --- |
| `__Host-luxa_at` | Access JWT (15 min). Carries the session id `sid`. | HttpOnly, Secure, SameSite=Lax, host-only |
| `luxa_rt` | Opaque refresh token. Only its SHA-256 is stored. | HttpOnly, Secure, SameSite=Lax, `Path=/auth/refresh` |
| `luxa_csrf` | Random CSRF token. Also the web's "session exists" marker. | Secure, SameSite=Lax, `Domain=$COOKIE_DOMAIN` |

- Trusted devices (`remember: true` on login) keep the session for 30 days. Otherwise the cookies end when the browser closes and the server caps the session at 24 h. Both lifetimes renew on every refresh.
- Every refresh rotates the token. Presenting an already-rotated token revokes the whole session family and logs an `auth.refresh_token_reuse` audit event.
- Every authenticated request checks that its session is still live. So `POST /auth/logout`, `POST /auth/logout-all` and `DELETE /auth/sessions/:id` take effect immediately. `GET /auth/sessions` lists the signed-in devices.
- Unsafe methods must come from an allowlisted `Origin`. When cookie-authenticated, they must also send `x-csrf-token` matching the `luxa_csrf` cookie.
- `Authorization: Bearer` is accepted outside production only, for tests and scripts.

## Error Handling

The API returns consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Error description here",
  "error": "Bad Request"
}
```

Common status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials or token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Database Migrations

Migrations are the **only** way the schema changes; `synchronize` is off in
every environment. They live in `src/database/migrations/` and run through
the TypeORM CLI (`src/database/data-source.ts`, which reads the same env as
the app).

```bash
pnpm migration:run                                   # apply pending migrations
pnpm migration:revert                                # undo the last one
pnpm migration:generate src/database/migrations/AddX # after changing an entity
pnpm migration:check                                 # fails if an entity change has no migration
pnpm db:seed                                         # demo business (idempotent)
```

Workflow for a schema change: edit the entity, run `migration:generate`
against a database that is up to date, read the generated SQL (TypeORM
drops and re-adds a column when its type changes, so hand-write an
`ALTER ... USING` when data must be kept, as in `MoneyToKobo`), then commit
the entity and the migration together. CI runs every migration on an empty
Postgres and then `migration:check`, so a missing migration fails the build.

**Existing databases** created by the old `synchronize` setup: the
`Baseline` migration notices the tables already exist and only records
itself, then `MoneyToKobo` converts the money columns in place. Back up
first, then run `pnpm migration:run`.

### Money

Money is stored as integer **kobo** (`bigint`, ₦1 = 100 kobo) so sums are
exact. Entities and the API still use naira numbers: the column transformer
in `src/common/money/money.ts` converts at the edge (`toKobo`, `fromKobo`,
`formatNaira`). Raw SQL over money columns must wrap the expression in
`nairaSql(...)` to return naira. The `items` snapshot inside
`held_transactions` is an opaque cart copy and stays in naira.

### Demo data

`pnpm db:seed` creates *Ade Mart (demo)*: `owner@`, `manager@` and
`cashier@demo.luxa.app`, 20 products and 30 days of sales. The password is
`SEED_PASSWORD`, or `LuxaDemo#2026` when unset. Running it again changes
nothing. It refuses `NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=true`
(staging).

### Tests against Postgres

`test/database.e2e-spec.ts` runs the migrations on a real database and checks
the kobo round-trip. It is skipped unless `TEST_DATABASE_URL` points at a
**disposable** database (it is wiped); CI supplies one.

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -U postgres -d luxa_sales -h localhost -p 5432
```

### Port Already in Use

```bash
# Change port in .env
PORT=3002

# Or kill process on port 4000 (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Documentation

- **Backend Specification:** See [../sales/BACKEND_SPECIFICATION.md](../sales/BACKEND_SPECIFICATION.md)
- **Phase Tracking:** See [PHASES.md](./PHASES.md)
- **Phase 1 Testing:** See [PHASE1_TESTING.md](./PHASE1_TESTING.md)
- **API Endpoints JSON:** See [../sales/BACKEND_ENDPOINTS.json](../sales/BACKEND_ENDPOINTS.json)

## Contributing

1. Each phase must be tested and approved before moving to the next
2. Follow the testing guide for the current phase
3. Document all changes in PHASES.md
4. Update this README when adding new modules

## License

Proprietary - LUXA Sales Management System

---

**Current Status:** Phase 1 Complete - Ready for Testing ✅

See [PHASE1_TESTING.md](./PHASE1_TESTING.md) for testing instructions.
