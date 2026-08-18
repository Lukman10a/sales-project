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

Edit `.env` with your database credentials:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/luxa_sales
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
PORT=4000
FRONTEND_URL=http://localhost:3000
```

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
# Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@business.com","password":"Password123!","firstName":"John","lastName":"Doe","businessName":"Prime Store"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@business.com","password":"Password123!"}'

# Get current user (requires token)
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
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

| Variable                 | Description                             | Default               |
| ------------------------ | --------------------------------------- | --------------------- |
| `DATABASE_URL`           | PostgreSQL connection string            | -                     |
| `DATABASE_HOST`          | Database host                           | localhost             |
| `DATABASE_PORT`          | Database port                           | 5432                  |
| `DATABASE_USERNAME`      | Database user                           | postgres              |
| `DATABASE_PASSWORD`      | Database password                       | -                     |
| `DATABASE_NAME`          | Database name                           | luxa_sales            |
| `JWT_SECRET`             | JWT access token secret (min 32 chars)  | -                     |
| `JWT_REFRESH_SECRET`     | JWT refresh token secret (min 32 chars) | -                     |
| `JWT_EXPIRATION`         | Access token expiration                 | 15m                   |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration                | 7d                    |
| `PORT`                   | Server port                             | 4000                  |
| `NODE_ENV`               | Environment mode                        | development           |
| `FRONTEND_URL`           | Frontend URL for CORS                   | http://localhost:3000 |
| `LOG_LEVEL`              | Logging level                           | debug                 |

## Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT access tokens (15min expiration)
- ✅ JWT refresh tokens (7 day expiration)
- ✅ CORS enabled for frontend
- ✅ Business data isolation (users can only access their own data)
- ✅ Input validation with class-validator
- ✅ SQL injection protection via TypeORM parameterized queries
- 🔄 Rate limiting (coming in Phase 2)
- 🔄 Token blacklist on logout (coming in Phase 2)

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

TypeORM synchronization is enabled in development mode:

```typescript
// database.config.ts
synchronize: process.env.NODE_ENV === 'development';
```

**⚠️ Warning:** Disable `synchronize` in production and use proper migrations:

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run
```

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
