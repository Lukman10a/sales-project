# PLAN-003: Phase 3 — Inventory Management Module

- **Module**: Inventory Management
- **Specification Reference**: [`SPEC-001 Section 4.2: Phase 3 Inventory Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#42-phase-3-inventory-module)
- **Status**: ✅ Implemented
- **Conventions**: This plan follows the guardrails from [`PLAN-001`](./PLAN-001-development-guardrails.md) and [`TDD_WORKFLOW.md`](../TDD_WORKFLOW.md). Every DTO is a **Zod schema + inferred type** applied via `ZodValidationPipe`; domain queries live in **colocated repositories** (`src/inventory/inventory.repository.ts`); services never import `typeorm`/`@nestjs/typeorm`; every logic unit has a **colocated `*.spec.ts`**; the full gate is **`npm run check`**.

---

## 1. Objectives

1. Build complete inventory CRUD endpoints isolated strictly by `businessId`.
2. Implement auto-calculation of stock status (`in-stock`, `low-stock`, `out-of-stock`).
3. Support filtering (category, status, search) and multi-field sorting.
4. Implement atomic stock decrement with `inventory.low-stock` event trigger.
5. Implement bulk import endpoint parsing multipart CSV and JSON uploads.
6. Write unit tests for all inventory operations (service, controller, repository).

---

## 2. Files to Create & Modify

```
src/
├── inventory/
│   ├── dto/
│   │   ├── create-inventory.dto.ts                  # [IMPLEMENTED] Zod schema + inferred type
│   │   ├── update-inventory.dto.ts                  # [IMPLEMENTED] Zod schema + inferred type
│   │   ├── query-inventory.dto.ts                   # [IMPLEMENTED] Zod schema + inferred type (filter/sort/pagination)
│   │   └── decrement-inventory.dto.ts               # [IMPLEMENTED] Zod schema + inferred type
│   ├── inventory.repository.ts                      # [IMPLEMENTED] Colocated repository (extends Repository<InventoryItem>)
│   ├── inventory.controller.ts                      # [IMPLEMENTED] Route handlers & guards (ZodValidationPipe)
│   ├── inventory.service.ts                         # [IMPLEMENTED] Business logic (no direct TypeORM)
│   ├── inventory.module.ts                          # [IMPLEMENTED] Module definition
│   ├── inventory.controller.spec.ts                 # [IMPLEMENTED] Unit test suite (parity)
│   ├── inventory.service.spec.ts                    # [IMPLEMENTED] Unit test suite
│   └── inventory.repository.spec.ts                 # [IMPLEMENTED] Unit test suite (parity)
└── app.module.ts                                    # [IMPLEMENTED] Register InventoryModule
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory` | `view-inventory` \| `view-products` | List products with pagination, category/status/search, sort |
| `GET` | `/inventory/:id`| Authenticated | Get single product by ID (must match `businessId`) |
| `POST` | `/inventory` | `edit-inventory` \| `edit-products` | Create product (auto status calculate) |
| `PATCH` | `/inventory/:id`| `edit-inventory` \| `edit-products` | Update product details & recalculate status |
| `DELETE`| `/inventory/:id`| `delete-products` | Delete product |
| `POST` | `/inventory/:id/decrement` | `record-sales` | Reduce stock; emit `inventory.low-stock` if low |
| `POST` | `/inventory/bulk-import` | `edit-inventory` \| `owner` | Parse CSV/JSON and bulk create/update items |

---

## 4. Implementation Details & Formulas

1. **Status Auto-Calculation** (pure helper, unit-testable):
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
3. **Atomic Stock Decrement** — the SQL-level decrement lives in the **repository layer**; the service orchestrates and emits events:
   ```typescript
   // inventory.repository.ts
   async decrementStock(id: string, businessId: string, qty: number): Promise<InventoryItem | null> {
     await this.createQueryBuilder()
       .update(InventoryItem)
       .set({
         quantity: () => 'quantity - :qty',
         sold: () => 'sold + :qty',
         status: () => `CASE WHEN quantity - :qty <= 0 THEN 'out-of-stock'
                        WHEN reorder_point IS NOT NULL AND quantity - :qty <= reorder_point THEN 'low-stock'
                        ELSE 'in-stock' END`,
       })
       .where('id = :id AND businessId = :businessId AND quantity >= :qty', { id, businessId, qty })
       .execute();
     return this.findOne({ where: { id, businessId } });
   }
   ```
   ```typescript
   // inventory.service.ts — orchestrates, emits
   async decrement(user: CurrentUserPayload, dto: DecrementInventoryDto) {
     const item = await this.inventoryRepository.decrementStock(dto.id, user.businessId, dto.quantity);
     if (!item) throw new NotFoundException('Product not found');
     if (item.quantity < dto.quantity) throw new BadRequestException('Insufficient stock');
     if (item.status === 'low-stock') {
       this.eventEmitter.emit('inventory.low-stock', { businessId: item.businessId, item });
     }
     return item;
   }
   ```
4. **Bulk Import**:
   - Use `csv-parse/sync` or stream parser.
   - Map headers: `name,category,sku,wholesalePrice,sellingPrice,quantity,reorderPoint,supplier`.
   - Validate each row with the Zod row schema; return `{ imported: count, skipped: count, errors: [] }`.
   - Bulk writes run through `inventory.repository` (optionally inside `inventoryRepository.transaction(fn)` for atomicity).

---

## 5. Verification Checklist

- [x] All queries include `where: { businessId: user.businessId }` (AGENTS.md §3.1).
- [x] Product status dynamically changes on creation and quantity update.
- [x] Stock decrement prevents negative inventory (atomic SQL guard).
- [x] `inventory.low-stock` event emits when `quantity <= reorderPoint`.
- [x] Bulk import handles valid CSVs and rejects malformed rows gracefully.
- [x] Test parity holds: `npm run check:tdd` reports 0 missing specs.
- [x] Full gate passes: `npm run check` (lint, typecheck, arch, parity, unit, e2e, build).
