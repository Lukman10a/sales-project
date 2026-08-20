# LUXA Sales - Backend Specification for NestJS

**Project:** LUXA Sales Management System  
**Backend Framework:** NestJS with TypeORM + PostgreSQL  
**API Version:** 1.0  
**Last Updated:** February 9, 2026  
**Status:** Specification (Ready for Implementation)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Entities & Data Models](#core-entities--data-models)
3. [Authentication & Security](#authentication--security)
4. [Owner-Side Endpoints (Phase 1)](#owner-side-endpoints-phase-1)
5. [Backend Prompt for Development](#backend-prompt-for-development)
6. [Testing Sequence (Incremental)](#testing-sequence-incremental)
7. [Database Schema](#database-schema)
8. [Environment Configuration](#environment-configuration)

---

## Project Overview

**LUXA Sales** is a multi-user retail management system for small to medium businesses. This specification focuses on Phase 1: Owner-side endpoints to establish core functionality.

### Key Features (Owner Side)

- Dashboard metrics & analytics
- Complete inventory management (CRUD)
- Sales recording & history
- Analytics & reporting
- Team management & permissions
- Notification system
- User profile & settings

### Target Users (Phase 1)

- Business Owners (full access)
- Managers (delegated access)

---

## Core Entities & Data Models

### 1. User (Authentication)

**Purpose:** Manage user accounts, authentication, and roles

```typescript
interface User {
  id: string (UUID)
  email: string (unique)
  password: string (hashed bcrypt)
  firstName: string
  lastName: string
  businessName: string
  role: 'owner' | 'manager' | 'apprentice'
  staffRole?: 'sales-assistant' | 'manager' | 'checkout' | 'inventory'
  avatar?: string (URL/base64)
  status: 'active' | 'inactive' | 'invited'
  createdAt: timestamp
  updatedAt: timestamp
  lastLogin?: timestamp
}
```

### 2. InventoryItem

**Purpose:** Track products in stock

```typescript
interface InventoryItem {
  id: string (UUID)
  businessId: string (FK)
  name: string (unique per business)
  category: string[]
  sku?: string (unique per business)
  barcode?: string
  description?: string

  wholesalePrice: number (decimal)
  sellingPrice: number (decimal)
  quantity: number (int)
  reorderPoint?: number

  supplier?: string
  lastRestocked?: date

  image?: string (URL)
  bundleQuantity?: number
  bundlePrice?: number

  sold: number (total units sold)
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  confirmedByApprentice: boolean

  createdAt: timestamp
  updatedAt: timestamp
  createdBy: string (FK to User)
  updatedBy?: string (FK to User)
}
```

### 3. Sale

**Purpose:** Record transactions

```typescript
interface Sale {
  id: string (UUID)
  businessId: string (FK)

  items: SaleItem[] (embedded/relation)
  subtotal: number
  discountPercent: number
  discountAmount: number
  total: number

  paymentMethod: 'cash' | 'card' | 'transfer' | 'split' | 'account'
  splitPayments?: PaymentPart[] (only if split)

  customerId?: string (FK, optional)
  customerName?: string

  loyaltyPointsEarned?: number
  loyaltyPointsUsed?: number
  accountCredit?: number

  status: 'completed' | 'pending' | 'refunded' | 'partial-refund'

  saleDate: date
  soldBy: string (FK to User)
  createdAt: timestamp

  // Refund tracking
  refundAmount?: number
  refundReason?: string
  refundDate?: date
  originalSaleId?: string (FK for refunds)
}

interface SaleItem {
  productId: string (FK)
  productName: string
  quantity: number
  price: number (actual price at sale time)
  total: number (quantity * price)
}

interface PaymentPart {
  method: 'cash' | 'card' | 'transfer' | 'account'
  amount: number
}
```

### 4. HeldTransaction

**Purpose:** Manage paused/held sales

```typescript
interface HeldTransaction {
  id: string (UUID)
  businessId: string (FK)

  customerName: string
  items: SaleItem[]
  discountPercent: number

  paymentMethod: 'cash' | 'card' | 'transfer' | 'split' | 'account'
  splitPayments?: PaymentPart[]

  selectedCustomer?: { name: string }
  saleDate?: date

  heldBy: string (FK to User)
  createdAt: timestamp
  expiresAt: timestamp (auto-cleanup after 24 hours)
}
```

### 5. Notification

**Purpose:** Alert system for inventory, sales, and AI

```typescript
interface Notification {
  id: string (UUID)
  businessId: string (FK)
  userId: string (FK)

  type: 'inventory' | 'sale' | 'alert' | 'ai' | 'system'
  title: string
  message: string

  read: boolean
  readAt?: timestamp

  actionable: boolean
  actionType?: 'reorder' | 'confirm' | 'approve' | 'manage' | 'task' | 'discount'
  relatedItemId?: string

  createdAt: timestamp
}
```

### 6. TeamMember

**Purpose:** Manage staff and permissions

```typescript
interface TeamMember {
  id: string (UUID)
  businessId: string (FK)
  userId: string (FK)

  name: string
  email: string
  phone?: string
  avatar?: string

  role: 'owner' | 'manager' | 'sales-assistant' | 'checkout' | 'inventory'
  status: 'active' | 'inactive' | 'invited'

  permissions: Permission[]

  department?: string
  joinedDate: date
  lastActive?: timestamp

  invitedBy?: string (FK)
  createdAt: timestamp
}

type Permission =
  'view-products'
  | 'edit-products'
  | 'delete-products'
  | 'view-sales-history'
  | 'record-sales'
  | 'view-inventory'
  | 'edit-inventory'
  | 'assign-roles'
  | 'view-reports'
```

### 7. UserProfile

**Purpose:** Extended user information

```typescript
interface UserProfile {
  id: string (UUID)
  userId: string (FK, unique)

  phone?: string
  company?: string
  address?: string
  city?: string
  country?: string
  bio?: string

  // Preferences
  notificationPreferences: NotificationPreferences
  appearanceSettings: AppearanceSettings

  createdAt: timestamp
  updatedAt: timestamp
}

interface NotificationPreferences {
  email: boolean
  push: boolean
  lowStock: boolean
  newSales: boolean
  reports: boolean
  teamActivity: boolean
  aiInsights: boolean
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  currency: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  compactMode: boolean
}
```

---

## Authentication & Security

### JWT Strategy

- **Token Type:** Bearer JWT
- **Payload:** `{ sub: userId, email, role, businessId }`
- **Access Token Expiry:** 15 minutes
- **Refresh Token Expiry:** 7 days
- **Secret Key:** From `.env` (min 32 chars)

### Password Security

- **Hashing:** bcrypt with salt (10 rounds minimum)
- **Minimum Length:** 8 characters
- **Requirements:** At least 1 uppercase, 1 number, 1 special character

### Request Validation

- All endpoints validate user authentication
- Role-based access control (RBAC) on protected routes
- Business isolation: Users can only access their own business data

---

## Owner-Side Endpoints (Phase 1)

### Authentication Module

#### **POST /auth/register**

**Description:** Create new business account  
**Access:** Public  
**Request Body:**

```json
{
  "email": "owner@business.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "businessName": "Prime Store"
}
```

**Response (201):**

```json
{
  "user": {
    "id": "uuid",
    "email": "owner@business.com",
    "firstName": "John",
    "role": "owner",
    "businessName": "Prime Store"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### **POST /auth/login**

**Description:** Authenticate user  
**Access:** Public  
**Request Body:**

```json
{
  "email": "owner@business.com",
  "password": "SecurePass123!"
}
```

**Response (200):** Same as register

#### **POST /auth/refresh**

**Description:** Get new access token  
**Access:** Public  
**Request Body:**

```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200):**

```json
{
  "accessToken": "new_jwt_token"
}
```

#### **POST /auth/logout**

**Description:** Invalidate tokens  
**Access:** Authenticated  
**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

### Inventory Module

#### **GET /inventory**

**Description:** List all products (with pagination & filters)  
**Access:** Authenticated (owner, manager, staff)  
**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `category` (filter by category)
- `status` (in-stock, low-stock, out-of-stock)
- `search` (search by name or sku)
- `sort` (name, price-asc, price-desc, quantity, sold)

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 15",
      "category": ["Electronics", "Phones"],
      "sku": "IPH-15-128GB",
      "wholesalePrice": 400000,
      "sellingPrice": 550000,
      "quantity": 12,
      "sold": 45,
      "status": "in-stock",
      "lastRestocked": "2026-02-09",
      "createdAt": "2026-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### **GET /inventory/:id**

**Description:** Get single product details  
**Access:** Authenticated  
**Response (200):**

```json
{
  "id": "uuid",
  "name": "iPhone 15",
  "category": ["Electronics", "Phones"],
  "sku": "IPH-15-128GB",
  "barcode": "8901234567890",
  "wholesalePrice": 400000,
  "sellingPrice": 550000,
  "quantity": 12,
  "reorderPoint": 5,
  "sold": 45,
  "supplier": "Tech Suppliers Ltd",
  "lastRestocked": "2026-02-09",
  "status": "in-stock",
  "image": "https://...",
  "bundleQuantity": 2,
  "bundlePrice": 1000000,
  "createdBy": "user-uuid",
  "createdAt": "2026-01-01T10:00:00Z"
}
```

#### **POST /inventory**

**Description:** Create new product  
**Access:** Authenticated (owner, manager, edit-products permission)  
**Request Body:**

```json
{
  "name": "iPhone 15",
  "category": ["Electronics", "Phones"],
  "sku": "IPH-15-128GB",
  "barcode": "8901234567890",
  "wholesalePrice": 400000,
  "sellingPrice": 550000,
  "quantity": 10,
  "reorderPoint": 5,
  "supplier": "Tech Suppliers Ltd",
  "image": "base64_or_url",
  "bundleQuantity": 2,
  "bundlePrice": 1000000
}
```

**Response (201):** Created product object

#### **PATCH /inventory/:id**

**Description:** Update product  
**Access:** Authenticated (owner, manager, edit-products permission)  
**Request Body:** Any partial subset of creation fields  
**Response (200):** Updated product object

#### **DELETE /inventory/:id**

**Description:** Delete product  
**Access:** Authenticated (owner, manager, delete-products permission)  
**Response (204):** Empty

#### **POST /inventory/:id/decrement**

**Description:** Reduce stock (on sale)  
**Access:** Authenticated (owner, manager, record-sales permission)  
**Request Body:**

```json
{
  "quantity": 2
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "name": "iPhone 15",
  "quantity": 10,
  "message": "Stock decremented by 2"
}
```

#### **POST /inventory/bulk-import**

**Description:** Import multiple products via CSV/JSON  
**Access:** Authenticated (owner, manager)  
**Request:** Form-data with file upload  
**Response (200):**

```json
{
  "imported": 45,
  "skipped": 2,
  "errors": [
    {
      "row": 5,
      "reason": "Duplicate SKU"
    }
  ]
}
```

---

### Sales Module

#### **GET /sales**

**Description:** List all sales transactions (with pagination & filters)  
**Access:** Authenticated (owner, manager, view-sales-history permission)  
**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)
- `dateFrom` (ISO date)
- `dateTo` (ISO date)
- `status` (completed, pending, refunded)
- `paymentMethod` (cash, card, transfer, split)
- `minAmount` (minimum sale total)
- `maxAmount` (maximum sale total)
- `sort` (date-desc, amount-desc, by-staff)

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "items": [
        {
          "productId": "uuid",
          "productName": "iPhone 15",
          "quantity": 1,
          "price": 550000,
          "total": 550000
        }
      ],
      "subtotal": 550000,
      "discountPercent": 5,
      "discountAmount": 27500,
      "total": 522500,
      "paymentMethod": "cash",
      "customerId": "uuid",
      "customerName": "Ahmed Hassan",
      "status": "completed",
      "saleDate": "2026-02-09",
      "soldBy": "John Doe",
      "createdAt": "2026-02-09T14:30:00Z"
    }
  ],
  "pagination": {},
  "summary": {
    "totalSales": 2500000,
    "totalTransactions": 5,
    "averageTransaction": 500000
  }
}
```

#### **GET /sales/:id**

**Description:** Get single sale details  
**Access:** Authenticated  
**Response (200):** Single sale object (as above)

#### **POST /sales**

**Description:** Record a new sale (complete transaction)  
**Access:** Authenticated (owner, manager, record-sales permission)  
**Request Body:**

```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 1,
      "price": 550000
    }
  ],
  "discountPercent": 5,
  "paymentMethod": "cash",
  "customerId": "uuid",
  "customerName": "Ahmed Hassan",
  "loyaltyPointsUsed": 0,
  "accountCredit": 0,
  "saleDate": "2026-02-09"
}
```

**Response (201):** Created sale object

#### **PATCH /sales/:id/refund**

**Description:** Process refund for a sale  
**Access:** Authenticated (owner, manager)  
**Request Body:**

```json
{
  "refundAmount": 522500,
  "refundReason": "Customer changed mind",
  "refundDate": "2026-02-09"
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "status": "refunded",
  "refundAmount": 522500,
  "refundReason": "Customer changed mind",
  "refundDate": "2026-02-09",
  "message": "Refund processed successfully"
}
```

#### **POST /sales/held**

**Description:** Hold a transaction (paused sale)  
**Access:** Authenticated (owner, manager, record-sales permission)  
**Request Body:**

```json
{
  "customerName": "Ahmed Hassan",
  "items": [...],
  "discountPercent": 5,
  "paymentMethod": "cash"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "customerName": "Ahmed Hassan",
  "items": [...],
  "heldBy": "John Doe",
  "createdAt": "2026-02-09T14:30:00Z",
  "expiresAt": "2026-02-10T14:30:00Z"
}
```

#### **GET /sales/held**

**Description:** List all held transactions  
**Access:** Authenticated  
**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "customerName": "Ahmed Hassan",
      "itemCount": 2,
      "total": 1100000,
      "heldBy": "John Doe",
      "createdAt": "2026-02-09T14:30:00Z",
      "expiresAt": "2026-02-10T14:30:00Z"
    }
  ]
}
```

#### **DELETE /sales/held/:id**

**Description:** Remove a held transaction  
**Access:** Authenticated  
**Response (204):** Empty

---

### Analytics Module

#### **GET /analytics/summary**

**Description:** Get dashboard summary metrics  
**Access:** Authenticated (owner, manager)  
**Query Parameters:**

- `dateFrom` (ISO date)
- `dateTo` (ISO date)
- `period` (today, week, month)

**Response (200):**

```json
{
  "totalRevenue": 2500000,
  "totalOrders": 5,
  "netProfit": 625000,
  "avgOrderValue": 500000,
  "topProduct": {
    "id": "uuid",
    "name": "iPhone 15",
    "sold": 10,
    "revenue": 5500000
  },
  "trend": {
    "revenueChange": 12.5,
    "orderChange": -2.4,
    "profitChange": 8.1
  }
}
```

#### **GET /analytics/sales-chart**

**Description:** Get sales trend data for charts  
**Access:** Authenticated (owner, manager)  
**Query Parameters:**

- `period` (today-hourly, week-daily, month-weekly)

**Response (200):**

```json
{
  "data": [
    {
      "period": "2026-02-09",
      "revenue": 450000,
      "orders": 5,
      "profit": 90000,
      "expenses": 360000
    }
  ]
}
```

#### **GET /analytics/category-breakdown**

**Description:** Get sales by category  
**Access:** Authenticated (owner, manager)  
**Response (200):**

```json
{
  "data": [
    {
      "category": "Electronics",
      "value": 45,
      "percentage": 45,
      "revenue": 2500000
    }
  ]
}
```

#### **GET /analytics/top-products**

**Description:** Get top performing products  
**Access:** Authenticated (owner, manager)  
**Query Parameters:**

- `limit` (default: 5)
- `period` (week, month, year)

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 15",
      "sold": 45,
      "revenue": 24750000,
      "percentage": 15.3
    }
  ]
}
```

---

### Notifications Module

#### **GET /notifications**

**Description:** List user notifications  
**Access:** Authenticated  
**Query Parameters:**

- `read` (true, false, null for all)
- `type` (inventory, sale, alert, ai, system)
- `limit` (default: 20)

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "inventory",
      "title": "Low Stock Alert",
      "message": "iPhone 15 stock below reorder point",
      "read": false,
      "readAt": null,
      "actionable": true,
      "actionType": "reorder",
      "relatedItemId": "uuid",
      "createdAt": "2026-02-09T14:30:00Z"
    }
  ],
  "unreadCount": 5
}
```

#### **PATCH /notifications/:id/read**

**Description:** Mark notification as read  
**Access:** Authenticated  
**Response (200):**

```json
{
  "id": "uuid",
  "read": true,
  "readAt": "2026-02-09T14:35:00Z"
}
```

#### **DELETE /notifications/:id**

**Description:** Delete a notification  
**Access:** Authenticated  
**Response (204):** Empty

#### **POST /notifications/mark-all-read**

**Description:** Mark all notifications as read  
**Access:** Authenticated  
**Response (200):**

```json
{
  "updated": 5,
  "message": "All notifications marked as read"
}
```

---

### Team Management Module

#### **GET /team**

**Description:** List all team members  
**Access:** Authenticated (owner, manager with assign-roles permission)  
**Query Parameters:**

- `status` (active, inactive, invited)
- `role` (owner, manager, sales-assistant, checkout, inventory)

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Ibrahim Musa",
      "email": "ibrahim@luxa.com",
      "phone": "+234-xxx-xxx",
      "role": "manager",
      "status": "active",
      "permissions": ["view-products", "record-sales", "view-sales-history"],
      "department": "Sales",
      "joinedDate": "2026-01-01",
      "lastActive": "2026-02-09T14:30:00Z"
    }
  ]
}
```

#### **GET /team/:id**

**Description:** Get team member details  
**Access:** Authenticated  
**Response (200):** Single team member object (as above)

#### **POST /team**

**Description:** Invite new team member  
**Access:** Authenticated (owner, manager with assign-roles permission)  
**Request Body:**

```json
{
  "email": "newstaff@business.com",
  "name": "New Staff",
  "phone": "+234-xxx-xxx",
  "role": "sales-assistant",
  "permissions": ["view-products", "record-sales"],
  "department": "Sales"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "email": "newstaff@business.com",
  "name": "New Staff",
  "role": "sales-assistant",
  "status": "invited",
  "message": "Invitation sent to email"
}
```

#### **PATCH /team/:id**

**Description:** Update team member  
**Access:** Authenticated (owner, manager with assign-roles permission)  
**Request Body:** Any partial subset of team member fields  
**Response (200):** Updated team member object

#### **DELETE /team/:id**

**Description:** Remove team member  
**Access:** Authenticated (owner only)  
**Response (204):** Empty

#### **PATCH /team/:id/permissions**

**Description:** Update member permissions  
**Access:** Authenticated (owner, manager with assign-roles permission)  
**Request Body:**

```json
{
  "permissions": [
    "view-products",
    "edit-products",
    "record-sales",
    "view-sales-history"
  ]
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "permissions": [...],
  "message": "Permissions updated"
}
```

---

### User Profile & Settings Module

#### **GET /profile**

**Description:** Get current user profile  
**Access:** Authenticated  
**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "email": "owner@business.com",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Prime Store",
    "role": "owner"
  },
  "profile": {
    "phone": "+234-xxx-xxx",
    "company": "Prime Store",
    "address": "123 Main St",
    "city": "Lagos",
    "country": "Nigeria",
    "bio": "Business owner",
    "avatar": "https://..."
  },
  "preferences": {
    "notificationPreferences": {
      "email": true,
      "push": true,
      "lowStock": true,
      "newSales": true
    },
    "appearanceSettings": {
      "theme": "light",
      "language": "en",
      "currency": "NGN",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h"
    }
  }
}
```

#### **PATCH /profile**

**Description:** Update current user profile  
**Access:** Authenticated  
**Request Body:**

```json
{
  "firstName": "John",
  "phone": "+234-xxx-xxx",
  "address": "123 Main St",
  "bio": "Updated bio"
}
```

**Response (200):** Updated profile object

#### **PATCH /profile/preferences**

**Description:** Update notification preferences  
**Access:** Authenticated  
**Request Body:**

```json
{
  "notificationPreferences": {
    "email": true,
    "lowStock": false,
    "newSales": true
  }
}
```

**Response (200):** Updated preferences object

#### **POST /profile/change-password**

**Description:** Change user password  
**Access:** Authenticated  
**Request Body:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response (200):**

```json
{
  "message": "Password changed successfully"
}
```

#### **POST /profile/avatar**

**Description:** Upload avatar image  
**Access:** Authenticated  
**Request:** Form-data with file (image/jpeg, image/png, max 5MB)  
**Response (200):**

```json
{
  "avatar": "https://...",
  "message": "Avatar uploaded successfully"
}
```

---

### Dashboard Module

#### **GET /dashboard**

**Description:** Get complete dashboard data (owner view)  
**Access:** Authenticated (owner, manager)  
**Query Parameters:**

- `period` (today, week, month)

**Response (200):**

```json
{
  "summary": {
    "totalRevenue": 2500000,
    "totalOrders": 5,
    "netProfit": 625000,
    "monthlyGoal": 10000000,
    "goalProgress": 25
  },
  "inventory": {
    "totalItems": 150,
    "inStock": 120,
    "lowStock": 25,
    "outOfStock": 5
  },
  "recentSales": [...],
  "lowStockItems": [...],
  "topProducts": [...],
  "aiInsights": [...]
}
```

---

## Backend Prompt for Development

### **COMPREHENSIVE NESTJS BACKEND DEVELOPMENT PROMPT**

````
You are building a NestJS backend for LUXA Sales, a retail management system.
Follow these requirements exactly:

## Project Setup
- Framework: NestJS v10+
- Database: PostgreSQL with TypeORM
- Authentication: JWT with Bcrypt
- Validation: class-validator + class-transformer
- Documentation: Swagger/OpenAPI
- Testing: Jest + Supertest
- Environment: Use .env for configuration

## Architecture Requirements
1. **Modular Structure:**
   - Each domain (auth, inventory, sales, etc.) in separate modules
   - Services handle business logic
   - Controllers handle HTTP requests/responses
   - DTOs for request/response validation
   - Entities for database models

2. **Authentication:**
   - JWT Strategy with access + refresh tokens
   - Bcrypt for password hashing (10 rounds)
   - Role-based access control (RBAC) with Guards
   - Business isolation (users can only see their business data)

3. **Validation:**
   - Input validation on all endpoints (class-validator)
   - Error handling with proper HTTP status codes
   - Meaningful error messages in responses

4. **Database:**
   - TypeORM with PostgreSQL
   - Relationships: One-to-Many (Users-to-Sales), Many-to-Many (Users-to-Permissions)
   - Soft deletes where appropriate
   - Proper indexing on frequently queried fields

5. **API Design:**
   - RESTful endpoints as specified
   - Pagination support (page, limit)
   - Filtering and sorting capabilities
   - Standard response format:
     ```json
     {
       "data": {...},
       "statusCode": 200,
       "timestamp": "ISO-8601",
       "message": "Success"
     }
     ```

6. **Error Handling:**
   - Global exception filter
   - Specific HTTP exceptions (BadRequest, Unauthorized, NotFound, Forbidden)
   - Proper error responses with status codes

7. **Documentation:**
   - Swagger decorators on all controllers
   - Clear endpoint descriptions
   - Example request/response bodies
   - Authentication scheme documentation

8. **Testing Strategy:**
   - Unit tests for services
   - Integration tests for controllers
   - E2E tests for complete workflows
   - Mock data for testing

## Implementation Order (Simple to Complex)
1. Start with Auth module (register, login, token refresh)
2. Add User Profile management
3. Build Inventory module (full CRUD)
4. Implement Sales module (record, list, refund)
5. Add Analytics endpoints (summary, charts)
6. Build Notifications system
7. Complete Team Management

## Key Features (Owner Phase)
- Multi-user with role hierarchy
- Business data isolation
- Soft delete support
- Audit logging (who did what, when)
- Transaction handling for inventory decrements
- Cascading deletes where needed

## Security Considerations
- Validate all inputs (no SQL injection, XSS)
- Hash passwords (never store plain text)
- Validate JWT on protected routes
- Rate limiting on auth endpoints
- CORS configuration with frontend domain
- Sanitize file uploads (if applicable)

## Database Relationships
- User (1) -> (Many) Sale
- User (1) -> (Many) InventoryItem (createdBy)
- User (1) -> (Many) TeamMember
- Business (1) -> (Many) InventoryItem
- Business (1) -> (Many) Sale
- InventoryItem (1) -> (Many) SaleItem
- Sale (1) -> (Many) SaleItem

## Run Testing
After implementation, ensure:
1. All endpoints return correct status codes
2. Authentication works (tokens issued/validated)
3. Business isolation enforced (user can't see other business data)
4. Pagination works with limits
5. Filtering/sorting functions correctly
6. Error messages are clear
7. Database transactions are atomic
````

---

## Testing Sequence (Incremental)

Test each endpoint one by one in this order. Use **Postman** or **cURL** for testing.

### Phase 1: Authentication (Foundation)

**Prerequisites:** None

```bash
# 1. Register new owner account
POST /auth/register
Content-Type: application/json

{
  "email": "owner@test.com",
  "password": "TestPass123!",
  "firstName": "Test",
  "lastName": "Owner",
  "businessName": "Test Store"
}

# Expected: 201 Created + accessToken + refreshToken
# Save tokens for subsequent tests
```

```bash
# 2. Login with registered credentials
POST /auth/login
{
  "email": "owner@test.com",
  "password": "TestPass123!"
}

# Expected: 200 OK + tokens
```

```bash
# 3. Test refresh token
POST /auth/refresh
{
  "refreshToken": "previous_refresh_token"
}

# Expected: 200 OK + new accessToken
```

### Phase 2: User Profile

```bash
# 4. Get profile (authenticated)
GET /profile
Authorization: Bearer {accessToken}

# Expected: 200 OK + profile data
```

```bash
# 5. Update profile
PATCH /profile
Authorization: Bearer {accessToken}
{
  "phone": "+234-xxx-xxx",
  "address": "123 Main St"
}

# Expected: 200 OK + updated profile
```

### Phase 3: Inventory Management

```bash
# 6. Create inventory item
POST /inventory
Authorization: Bearer {accessToken}
{
  "name": "iPhone 15",
  "category": ["Electronics", "Phones"],
  "sku": "IPH-15-128GB",
  "wholesalePrice": 400000,
  "sellingPrice": 550000,
  "quantity": 10
}

# Expected: 201 Created + item with ID
# Save ID for next tests
```

```bash
# 7. List inventory items
GET /inventory?page=1&limit=20
Authorization: Bearer {accessToken}

# Expected: 200 OK + items array + pagination info
```

```bash
# 8. Get specific item
GET /inventory/{itemId}
Authorization: Bearer {accessToken}

# Expected: 200 OK + complete item details
```

```bash
# 9. Update inventory item
PATCH /inventory/{itemId}
Authorization: Bearer {accessToken}
{
  "quantity": 15,
  "sellingPrice": 575000
}

# Expected: 200 OK + updated item
```

```bash
# 10. Decrement inventory (simulate sale)
POST /inventory/{itemId}/decrement
Authorization: Bearer {accessToken}
{
  "quantity": 2
}

# Expected: 200 OK + new quantity (8 remaining)
```

### Phase 4: Sales Recording

```bash
# 11. Record a sale
POST /sales
Authorization: Bearer {accessToken}
{
  "items": [
    {
      "productId": "{itemId}",
      "quantity": 1,
      "price": 550000
    }
  ],
  "paymentMethod": "cash",
  "discountPercent": 5,
  "saleDate": "2026-02-09"
}

# Expected: 201 Created + sale ID + items decremented
# Save sale ID for refund test
```

```bash
# 12. List sales
GET /sales?page=1&limit=20
Authorization: Bearer {accessToken}

# Expected: 200 OK + sales list + summary stats
```

```bash
# 13. Get specific sale
GET /sales/{saleId}
Authorization: Bearer {accessToken}

# Expected: 200 OK + complete sale details
```

```bash
# 14. Process refund
PATCH /sales/{saleId}/refund
Authorization: Bearer {accessToken}
{
  "refundAmount": 522500,
  "refundReason": "Customer requested return"
}

# Expected: 200 OK + sale status changed to "refunded" + inventory incremented
```

### Phase 5: Held Transactions

```bash
# 15. Hold a transaction
POST /sales/held
Authorization: Bearer {accessToken}
{
  "customerName": "Ahmed Hassan",
  "items": [
    {
      "productId": "{itemId}",
      "quantity": 1,
      "price": 550000
    }
  ],
  "paymentMethod": "cash"
}

# Expected: 201 Created + heldId + expiresAt timestamp
# Save heldId
```

```bash
# 16. List held transactions
GET /sales/held
Authorization: Bearer {accessToken}

# Expected: 200 OK + all held transactions
```

```bash
# 17. Resolve held transaction by deleting
DELETE /sales/held/{heldId}
Authorization: Bearer {accessToken}

# Expected: 204 No Content
```

### Phase 6: Notifications

```bash
# 18. Get notifications
GET /notifications
Authorization: Bearer {accessToken}

# Expected: 200 OK + notifications + unreadCount
```

```bash
# 19. Mark notification as read
PATCH /notifications/{notificationId}/read
Authorization: Bearer {accessToken}

# Expected: 200 OK + notification with read=true
```

### Phase 7: Analytics

```bash
# 20. Get dashboard summary
GET /dashboard?period=week
Authorization: Bearer {accessToken}

# Expected: 200 OK + summary stats + recent sales + insights
```

```bash
# 21. Get sales chart data
GET /analytics/sales-chart?period=week
Authorization: Bearer {accessToken}

# Expected: 200 OK + time-series data for charts
```

```bash
# 22. Get top products
GET /analytics/top-products?limit=5
Authorization: Bearer {accessToken}

# Expected: 200 OK + top 5 products by sales
```

### Phase 8: Team Management

```bash
# 23. Invite team member
POST /team
Authorization: Bearer {accessToken}
{
  "email": "newstaff@business.com",
  "name": "New Staff",
  "role": "sales-assistant",
  "permissions": ["view-products", "record-sales"]
}

# Expected: 201 Created + invitation sent notification
```

```bash
# 24. List team members
GET /team
Authorization: Bearer {accessToken}

# Expected: 200 OK + team members
```

```bash
# 25. Update team member permissions
PATCH /team/{memberId}/permissions
Authorization: Bearer {accessToken}
{
  "permissions": ["view-products", "edit-products", "record-sales"]
}

# Expected: 200 OK + updated member
```

### Verification Checklist

- [ ] All endpoints return correct HTTP status codes
- [ ] JWT authentication on protected routes
- [ ] Business data isolation (test with 2 different accounts)
- [ ] Pagination works correctly
- [ ] Inventory decrements/increments properly on sales/refunds
- [ ] Timestamps are in correct format (ISO-8601)
- [ ] Error messages are descriptive
- [ ] Transactions are atomic (all or nothing)
- [ ] Soft deletes don't permanently remove data
- [ ] Audit trail logs who did what

---

## Database Schema

### User Table

```sql
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  businessName VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  staffRole VARCHAR(50),
  avatar TEXT,
  status VARCHAR(50) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  lastLogin TIMESTAMP
);
```

### InventoryItem Table

```sql
CREATE TABLE "inventory_item" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  businessId UUID NOT NULL REFERENCES "user"(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255)[],
  sku VARCHAR(100),
  barcode VARCHAR(100),
  description TEXT,
  wholesalePrice DECIMAL(10,2),
  sellingPrice DECIMAL(10,2),
  quantity INT DEFAULT 0,
  reorderPoint INT,
  supplier VARCHAR(255),
  lastRestocked DATE,
  image TEXT,
  bundleQuantity INT,
  bundlePrice DECIMAL(10,2),
  sold INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'in-stock',
  confirmedByApprentice BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  createdBy UUID REFERENCES "user"(id),
  updatedBy UUID REFERENCES "user"(id)
);
```

### Sale Table

```sql
CREATE TABLE "sale" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  businessId UUID NOT NULL REFERENCES "user"(id),
  subtotal DECIMAL(10,2),
  discountPercent DECIMAL(5,2) DEFAULT 0,
  discountAmount DECIMAL(10,2),
  total DECIMAL(10,2),
  paymentMethod VARCHAR(50),
  customerId UUID,
  customerName VARCHAR(255),
  loyaltyPointsEarned INT DEFAULT 0,
  loyaltyPointsUsed INT DEFAULT 0,
  accountCredit DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'completed',
  saleDate DATE,
  soldBy UUID NOT NULL REFERENCES "user"(id),
  createdAt TIMESTAMP DEFAULT NOW(),
  refundAmount DECIMAL(10,2),
  refundReason VARCHAR(255),
  refundDate DATE,
  originalSaleId UUID REFERENCES "sale"(id)
);

CREATE TABLE "sale_item" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saleId UUID NOT NULL REFERENCES "sale"(id) ON DELETE CASCADE,
  productId UUID NOT NULL REFERENCES "inventory_item"(id),
  productName VARCHAR(255),
  quantity INT,
  price DECIMAL(10,2),
  total DECIMAL(10,2),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Notification Table

```sql
CREATE TABLE "notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  businessId UUID NOT NULL REFERENCES "user"(id),
  userId UUID NOT NULL REFERENCES "user"(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT false,
  readAt TIMESTAMP,
  actionable BOOLEAN DEFAULT false,
  actionType VARCHAR(50),
  relatedItemId UUID,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### TeamMember Table

```sql
CREATE TABLE "team_member" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  businessId UUID NOT NULL REFERENCES "user"(id),
  userId UUID NOT NULL REFERENCES "user"(id),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  avatar TEXT,
  role VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  permissions VARCHAR(255)[],
  department VARCHAR(100),
  joinedDate DATE,
  lastActive TIMESTAMP,
  invitedBy UUID REFERENCES "user"(id),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_inventory_business ON "inventory_item"(businessId);
CREATE INDEX idx_inventory_name ON "inventory_item"(name);
CREATE INDEX idx_inventory_sku ON "inventory_item"(sku);
CREATE INDEX idx_sale_business ON "sale"(businessId);
CREATE INDEX idx_sale_date ON "sale"(saleDate);
CREATE INDEX idx_sale_status ON "sale"(status);
CREATE INDEX idx_notification_user ON "notification"(userId);
CREATE INDEX idx_notification_read ON "notification"(read);
CREATE INDEX idx_team_business ON "team_member"(businessId);
```

---

## Environment Configuration

### `.env` Template

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/luxa_sales
DB_HOST=localhost
DB_PORT=5432
DB_USER=luxa_user
DB_PASSWORD=secure_password_here
DB_NAME=luxa_sales

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters-long!
JWT_EXPIRATION=900 # 15 minutes
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars!
JWT_REFRESH_EXPIRATION=604800 # 7 days

# Server
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880 # 5MB in bytes
UPLOAD_FOLDER=./uploads

# Email (for future notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Logging
LOG_LEVEL=debug
```

---

## Summary

This specification provides:

1. ✅ Complete data models matching your frontend
2. ✅ 25+ endpoints organized by module
3. ✅ Detailed request/response examples
4. ✅ Security considerations
5. ✅ Database schema
6. ✅ Sequential testing guide
7. ✅ Development prompt ready to copy

**Next Steps:**

1. Create new NestJS project: `nest new luxa-backend`
2. Use this specification to scaffold modules
3. Follow the testing sequence to validate each feature
4. Replace frontend localStorage with actual API calls
