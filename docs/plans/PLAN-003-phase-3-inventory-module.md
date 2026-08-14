# PLAN-003: Phase 3 — Inventory Management Module

- **Module**: Inventory Management
- **Specification Reference**: [`SPEC-001 Section 4.2: Phase 3 Inventory Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#42-phase-3-inventory-module)
- **Status**: ⏳ Pending Implementation

---

## 1. Objectives

1. Build complete inventory CRUD endpoints isolated strictly by `businessId`.
2. Implement auto-calculation of stock status (`in-stock`, `low-stock`, `out-of-stock`).
3. Support filtering (category, status, search) and multi-field sorting.
4. Implement atomic stock decrement with `inventory.low-stock` event trigger.
5. Implement bulk import endpoint parsing multipart CSV and JSON uploads.
6. Write unit tests for all inventory operations.

---

## 2. Files to Create & Modify

```
src/
├── inventory/
│   ├── dto/
│   │   ├── create-inventory.dto.ts                  # [NEW] Validation for product creation
│   │   ├── update-inventory.dto.ts                  # [NEW] Partial update DTO
│   │   ├── query-inventory.dto.ts                   # [NEW] Filter, sort, and pagination DTO
│   │   └── decrement-inventory.dto.ts               # [NEW] Quantity decrement DTO
│   ├── inventory.controller.ts                      # [NEW] Route handlers & guards
│   ├── inventory.service.ts                         # [NEW] Business logic & DB queries
│   ├── inventory.module.ts                          # [NEW] Module definition & entity imports
│   └── inventory.service.spec.ts                    # [NEW] Unit test suite
└── app.module.ts                                    # [MODIFY] Register InventoryModule
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/inventory` | `view-inventory` \| `view-products` | List products with pagination, category/status/search, sort |
| `GET` | `/api/inventory/:id`| Authenticated | Get single product by ID (must match `businessId`) |
| `POST` | `/api/inventory` | `edit-inventory` \| `edit-products` | Create product (auto status calculate) |
| `PATCH` | `/api/inventory/:id`| `edit-inventory` \| `edit-products` | Update product details & recalculate status |
| `DELETE`| `/api/inventory/:id`| `delete-products` | Delete product |
| `POST` | `/api/inventory/:id/decrement` | `record-sales` | Reduce stock; emit `inventory.low-stock` if low |
| `POST` | `/api/inventory/bulk-import` | `edit-inventory` \| `owner` | Parse CSV/JSON and bulk create/update items |

---

## 4. Implementation Details & Formulas

1. **Status Auto-Calculation**:
   ```typescript
   function calculateStatus(quantity: number, reorderPoint?: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
     if (quantity <= 0) return 'out-of-stock';
     if (reorderPoint !== undefined && quantity <= reorderPoint) return 'low-stock';
     return 'in-stock';
   }
   ```
2. **Filtering & Sorting**:
   - Filter by `category` (matches any category in PostgreSQL text array), `status`, `search` (case-insensitive name or sku ILIKE).
   - Sort options: `name`, `price-asc`, `price-desc`, `quantity`, `sold`.
3. **Atomic Stock Decrement**:
   - Execute in TypeORM transaction:
     ```typescript
     const item = await repo.findOne({ where: { id, businessId: user.businessId } });
     if (!item) throw new NotFoundException('Product not found');
     if (item.quantity < qty) throw new BadRequestException('Insufficient stock');
     item.quantity -= qty;
     item.sold += qty;
     item.status = calculateStatus(item.quantity, item.reorderPoint);
     await repo.save(item);
     if (item.status === 'low-stock') {
       this.eventEmitter.emit('inventory.low-stock', { businessId: item.businessId, item });
     }
     ```
4. **Bulk Import**:
   - Use `csv-parse/sync` or stream parser.
   - Map headers: `name,category,sku,wholesalePrice,sellingPrice,quantity,reorderPoint,supplier`.
   - Validate each row; return `{ imported: count, skipped: count, errors: [] }`.

---

## 5. Verification Checklist

- [ ] All queries include `where: { businessId: user.businessId }`.
- [ ] Product status dynamically changes on creation and quantity update.
- [ ] Stock decrement prevents negative inventory.
- [ ] `inventory.low-stock` event emits when `quantity <= reorderPoint`.
- [ ] Bulk import handles valid CSVs and rejects malformed rows gracefully.
- [ ] `npm test inventory.service.spec.ts` passes.
