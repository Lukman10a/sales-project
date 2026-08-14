# SPEC-001: LUXA Sales Backend Technical Specification

- **System:** LUXA Sales Backend
- **Framework:** NestJS with TypeORM + PostgreSQL
- **API Prefix:** `/api`
- **Specification Version:** 1.0.0
- **Status:** Active / Source of Truth

---

## 1. System Overview & Architecture

LUXA Sales is a multi-user, multi-tenant retail and inventory management backend. The system provides complete business isolation, role-based access control (RBAC), atomic transaction handling for inventory sales, and event-driven notifications.

```
                    ┌─────────────────────────┐
                    │    NestJS Controllers   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     NestJS Services     │
                    └────┬───────────────┬────┘
                         │               │
      (Atomic Transactions)              │ (Event Emission)
                         │               │
        ┌────────────────▼───┐       ┌───▼─────────────────────┐
        │  TypeORM / Postgres│       │  EventEmitter2 Events   │
        └────────────────────┘       └───────────┬─────────────┘
                                                 │
                                     ┌───────────▼─────────────┐
                                     │  Notifications Service  │
                                     └─────────────────────────┘
```

---

## 2. Multi-Tenancy & Authentication Context

### 2.1 Tenant Isolation
- **Tenant Identifier**: `businessId` (UUID).
- **Owner Accounts**: When an owner registers, `businessId = user.id`.
- **Team Members**: When invited/added, `businessId` is inherited from the inviting business.
- **Enforcement**: Every entity table (except `users` root authentication) contains `businessId: string`. All queries filter by `where: { businessId: user.businessId }`.

### 2.2 JWT Payload Structure
```typescript
export interface JwtPayload {
  sub: string;           // User UUID
  email: string;         // User email
  role: string;          // 'owner' | 'manager' | 'apprentice' | 'sales-assistant' | 'checkout' | 'inventory'
  businessId: string;    // Tenant business UUID
  businessName: string;  // Registered business name
  permissions?: string[];// Active granular permissions
}
```

### 2.3 Roles & Permissions
- **Roles**: `'owner'`, `'manager'`, `'sales-assistant'`, `'checkout'`, `'inventory'`, `'apprentice'`.
- **Permissions**:
  - `view-products`
  - `edit-products`
  - `delete-products`
  - `view-sales-history`
  - `record-sales`
  - `view-inventory`
  - `edit-inventory`
  - `assign-roles`
  - `view-reports`
- **Owner Bypass**: Users with `role === 'owner'` bypass all permission checks automatically.

---

## 3. Database Entities & Schemas

### 3.1 User (`users`)
- `id`: UUID (PK)
- `email`: string (unique)
- `password`: string (bcrypt hash)
- `firstName`: string
- `lastName`: string
- `businessName`: string
- `businessId`: UUID (optional for legacy, populated on register/invite)
- `role`: enum (`owner`, `manager`, `apprentice`)
- `staffRole`: enum nullable (`sales-assistant`, `manager`, `checkout`, `inventory`)
- `avatar`: string nullable
- `status`: enum (`active`, `inactive`, `invited`)
- `lastLogin`: timestamp nullable
- `createdAt` / `updatedAt`: timestamp

### 3.2 UserProfile (`user_profiles`)
- `id`: UUID (PK)
- `userId`: UUID (unique, FK $\rightarrow$ User)
- `phone`, `company`, `address`, `city`, `country`, `bio`: string nullable
- `notificationPreferences`: JSON `{ email, push, lowStock, newSales, reports, teamActivity, aiInsights }`
- `appearanceSettings`: JSON `{ theme, language, currency, dateFormat, timeFormat, compactMode }`
- `createdAt` / `updatedAt`: timestamp

### 3.3 InventoryItem (`inventory_items`)
- `id`: UUID (PK)
- `businessId`: UUID (Indexed)
- `name`: string
- `category`: string[] (text array)
- `sku`: string nullable
- `barcode`: string nullable
- `description`: string nullable
- `wholesalePrice`: decimal(10, 2)
- `sellingPrice`: decimal(10, 2)
- `quantity`: int (default: 0)
- `reorderPoint`: int nullable
- `supplier`: string nullable
- `lastRestocked`: date nullable
- `image`: string nullable
- `bundleQuantity`: int nullable
- `bundlePrice`: decimal(10, 2) nullable
- `sold`: int (default: 0)
- `status`: enum (`in-stock`, `low-stock`, `out-of-stock`)
- `confirmedByApprentice`: boolean (default: false)
- `createdBy`: UUID
- `createdAt` / `updatedAt`: timestamp

### 3.4 Sale (`sales`) & SaleItem (`sale_items`)
- **Sale**:
  - `id`: UUID (PK)
  - `businessId`: UUID
  - `total`: decimal(12, 2)
  - `paymentMethod`: enum (`cash`, `card`, `transfer`, `split`, `account`)
  - `status`: enum (`completed`, `pending`, `refunded`, `partial-refund`)
  - `saleDate`: date
  - `soldBy`: UUID
  - `customerId`: UUID nullable
  - `customerName`: string nullable
  - `discountPercent`: decimal(5, 2) (default: 0)
  - `refundAmount`: decimal(12, 2) nullable
  - `refundReason`: string nullable
  - `createdAt`: timestamp
- **SaleItem**:
  - `id`: UUID (PK)
  - `saleId`: UUID (FK $\rightarrow$ Sale with cascade delete)
  - `productId`: UUID (FK $\rightarrow$ InventoryItem)
  - `quantity`: int
  - `price`: decimal(10, 2)
  - `createdAt`: timestamp

### 3.5 HeldTransaction (`held_transactions`)
- `id`: UUID (PK)
- `businessId`: UUID
- `customerName`: string
- `items`: JSON `Array<{ productId, quantity, price }>`
- `heldBy`: UUID
- `discountPercent`: decimal(5, 2)
- `paymentMethod`: string
- `expiresAt`: timestamp (default: `NOW() + 24 hours`)
- `createdAt`: timestamp

### 3.6 Notification (`notifications`)
- `id`: UUID (PK)
- `businessId`: UUID
- `userId`: UUID (FK $\rightarrow$ User)
- `type`: enum (`inventory`, `sale`, `alert`, `ai`, `system`)
- `title`: string
- `message`: string
- `read`: boolean (default: false)
- `metadata`: JSON nullable
- `createdAt`: timestamp

### 3.7 TeamMember (`team_members`)
- `id`: UUID (PK)
- `businessId`: UUID
- `userId`: UUID (FK $\rightarrow$ User)
- `name`: string
- `role`: enum (`owner`, `manager`, `sales-assistant`, `checkout`, `inventory`)
- `permissions`: string[] (text array)
- `department`: string nullable
- `status`: enum (`active`, `inactive`, `invited`)
- `joinedDate`: date
- `createdAt` / `updatedAt`: timestamp

---

## 4. Phase Specifications & Route Contracts

---

### 4.1 Phase 2: User Profile Module

| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/profile` | Authenticated | Get current user profile and settings |
| `PATCH` | `/profile` | Authenticated | Update user first/last name, phone, bio, address |
| `POST` | `/profile/change-password` | Authenticated | Validate current password and set new password |
| `PATCH` | `/profile/preferences` | Authenticated | Merge notification & appearance settings |
| `POST` | `/profile/avatar` | Authenticated | Upload profile avatar (multipart file / base64) |

---

### 4.2 Phase 3: Inventory Module

| Method | Path | Auth / Role / Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory` | Authenticated (`view-inventory` or `view-products`) | List items (pagination, category, status, search, sort) |
| `GET` | `/inventory/:id` | Authenticated | Get single product details |
| `POST` | `/inventory` | Authenticated (`edit-inventory` or `edit-products`) | Create product (auto-calculates initial status) |
| `PATCH` | `/inventory/:id` | Authenticated (`edit-inventory` or `edit-products`) | Update product & recalculate status |
| `DELETE` | `/inventory/:id` | Authenticated (`delete-products`) | Delete product |
| `POST` | `/inventory/:id/decrement`| Authenticated (`record-sales`) | Decrement stock; emits `inventory.low-stock` if low |
| `POST` | `/inventory/bulk-import` | Authenticated (`edit-inventory`) | Multipart CSV/JSON file parse and batch create/update |

**Status Auto-Calculation Formula:**
$$\text{status} = \begin{cases} \text{'out-of-stock'}, & \text{if } \text{quantity} \le 0 \\ \text{'low-stock'}, & \text{if } \text{quantity} \le \text{reorderPoint} \\ \text{'in-stock'}, & \text{otherwise} \end{cases}$$

---

### 4.3 Phase 4: Sales Module

| Method | Path | Auth / Role / Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/sales` | Authenticated (`record-sales`) | Record sale atomically, decrement stock, save items |
| `GET` | `/sales` | Authenticated (`view-sales-history`) | List sales history with date filters and summary stats |
| `GET` | `/sales/:id` | Authenticated (`view-sales-history`) | Get single sale with line items |
| `PATCH` | `/sales/:id/refund` | Authenticated (`owner` or `manager`) | Process refund, restore stock atomically |
| `POST` | `/sales/held` | Authenticated (`record-sales`) | Create held/paused transaction (24h lifespan) |
| `GET` | `/sales/held` | Authenticated (`record-sales`) | List active held transactions |
| `DELETE` | `/sales/held/:id` | Authenticated (`record-sales`) | Remove held transaction |

**Atomic Sale Transaction Flow:**
1. Start TypeORM transaction `dataSource.transaction(async (manager) => { ... })`.
2. For each line item:
   - Query `InventoryItem` with `where: { id, businessId }`.
   - Verify `quantity >= item.quantity`. If insufficient, throw `BadRequestException('Insufficient stock for item: ' + name)`.
   - Update quantity: `quantity = quantity - item.quantity` and `sold = sold + item.quantity`.
   - If new `quantity <= reorderPoint`, queue `inventory.low-stock` event.
3. Calculate subtotal, discount amount, and total.
4. Insert `Sale` and child `SaleItem` records.
5. Commit transaction and emit `sale.completed` event.

---

### 4.4 Phase 5: Analytics & Dashboard Module

| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Authenticated (`owner`, `manager`) | Full overview metrics, inventory counts, top products, recent sales |
| `GET` | `/analytics/summary` | Authenticated (`owner`, `manager`) | Summary metrics with period (`today`, `week`, `month`) & trends |
| `GET` | `/analytics/sales-chart` | Authenticated (`owner`, `manager`) | Time series data (hourly for today, daily for week, weekly for month) |
| `GET` | `/analytics/category-breakdown` | Authenticated (`owner`, `manager`) | Revenue & units grouped by category |
| `GET` | `/analytics/top-products` | Authenticated (`owner`, `manager`) | Top selling products ranked by revenue and units |

**Formulas:**
- **Net Profit**:
  $$\text{Net Profit} = \sum (\text{item.sellingPrice} - \text{item.wholesalePrice}) \times \text{item.quantitySold}$$
- **Trend Percentage Change**:
  $$\text{Change \%} = \begin{cases} 0, & \text{if } \text{prev} = 0 \text{ and } \text{curr} = 0 \\ 100, & \text{if } \text{prev} = 0 \text{ and } \text{curr} > 0 \\ \frac{\text{curr} - \text{prev}}{\text{prev}} \times 100, & \text{otherwise} \end{cases}$$

---

### 4.5 Phase 6: Notifications Module

| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Authenticated | List user notifications (type filter, read filter, unread count) |
| `PATCH` | `/notifications/:id/read` | Authenticated | Mark notification as read |
| `DELETE` | `/notifications/:id` | Authenticated | Delete notification |
| `POST` | `/notifications/mark-all-read` | Authenticated | Mark all notifications as read for current user |

**Event Subscriptions (`@nestjs/event-emitter`):**
- Event `inventory.low-stock`: Create notification with `type: 'inventory'`, `title: 'Low Stock Alert'`.
- Event `sale.completed`: Create notification with `type: 'sale'`, `title: 'New Sale Recorded'`.

---

### 4.6 Phase 7: Team Management Module

| Method | Path | Auth / Role / Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/team` | Authenticated (`owner`, `manager` with `assign-roles`) | List all team members |
| `GET` | `/team/:id` | Authenticated | Get team member details |
| `POST` | `/team` | Authenticated (`owner`, `manager` with `assign-roles`) | Invite new member (creates User + TeamMember) |
| `PATCH` | `/team/:id` | Authenticated (`owner`, `manager` with `assign-roles`) | Update member role, status, department |
| `DELETE` | `/team/:id` | Authenticated (`owner` only) | Remove team member |
| `PATCH` | `/team/:id/permissions`| Authenticated (`owner`, `manager` with `assign-roles`) | Update granular permissions array |
