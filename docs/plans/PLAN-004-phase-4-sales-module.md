# PLAN-004: Phase 4 — Sales & Transactions Module

- **Module**: Sales Transactions & History
- **Specification Reference**: [`SPEC-001 Section 4.3: Phase 4 Sales Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#43-phase-4-sales-module)
- **Status**: ⏳ Pending Implementation

---

## 1. Objectives

1. Record sales transactions atomically (`POST /api/sales`) with multi-item stock validation, automatic inventory decrement, and total calculations.
2. List sales history with date range filtering (`dateFrom`, `dateTo`), payment method filter, status filter, and summary calculations (`totalSales`, `totalTransactions`, `averageTransaction`).
3. Implement refund processing (`PATCH /api/sales/:id/refund`) that restores inventory quantities inside an atomic transaction.
4. Implement held/paused transactions (`HeldTransaction`) with 24-hour expiration lifecycles.
5. Emit `sale.completed` and `inventory.low-stock` events.
6. Write unit tests for all sales operations.

---

## 2. Files to Create & Modify

```
src/
├── sales/
│   ├── dto/
│   │   ├── create-sale.dto.ts                       # [NEW] Sale payload validation
│   │   ├── query-sales.dto.ts                       # [NEW] Filter and date range DTO
│   │   ├── refund-sale.dto.ts                       # [NEW] Refund payload DTO
│   │   └── create-held-transaction.dto.ts           # [NEW] Held transaction DTO
│   ├── sales.controller.ts                          # [NEW] Routes for sales & held
│   ├── sales.service.ts                             # [NEW] Transactional sales logic
│   ├── sales.module.ts                              # [NEW] Module definition
│   └── sales.service.spec.ts                        # [NEW] Unit test suite
└── app.module.ts                                    # [MODIFY] Register SalesModule
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sales` | `record-sales` | Record new sale, decrement stock atomically, emit events |
| `GET` | `/api/sales` | `view-sales-history` | List sales history, pagination, summary totals |
| `GET` | `/api/sales/:id` | `view-sales-history` | Get sale details with line items |
| `PATCH`| `/api/sales/:id/refund` | `owner` \| `manager` | Process refund and restore stock quantities |
| `POST` | `/api/sales/held` | `record-sales` | Create paused/held transaction (24h lifespan) |
| `GET` | `/api/sales/held` | `record-sales` | List active held transactions |
| `DELETE`| `/api/sales/held/:id`| `record-sales` | Remove/resolve held transaction |

---

## 4. Concurrency & Transaction Flow

### 4.1 `POST /api/sales`
```typescript
await this.dataSource.transaction(async (manager) => {
  let subtotal = 0;
  const saleItemsToSave: SaleItem[] = [];

  for (const item of createSaleDto.items) {
    const product = await manager.findOne(InventoryItem, {
      where: { id: item.productId, businessId: user.businessId },
    });
    if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
    if (product.quantity < item.quantity) {
      throw new BadRequestException(`Insufficient stock for ${product.name} (available: ${product.quantity})`);
    }

    // Atomic decrement
    product.quantity -= item.quantity;
    product.sold += item.quantity;
    product.status = calculateStatus(product.quantity, product.reorderPoint);
    await manager.save(product);

    if (product.status === 'low-stock') {
      this.eventEmitter.emit('inventory.low-stock', { businessId: user.businessId, item: product });
    }

    subtotal += Number(item.price) * item.quantity;
    const saleItem = manager.create(SaleItem, {
      productId: product.id,
      quantity: item.quantity,
      price: item.price,
    });
    saleItemsToSave.push(saleItem);
  }

  const discountPercent = createSaleDto.discountPercent || 0;
  const total = subtotal - (subtotal * (discountPercent / 100));

  const sale = manager.create(Sale, {
    businessId: user.businessId,
    total,
    paymentMethod: createSaleDto.paymentMethod,
    status: 'completed',
    saleDate: createSaleDto.saleDate ? new Date(createSaleDto.saleDate) : new Date(),
    soldBy: user.id,
    customerId: createSaleDto.customerId,
    customerName: createSaleDto.customerName,
    discountPercent,
    items: saleItemsToSave,
  });

  const savedSale = await manager.save(sale);
  this.eventEmitter.emit('sale.completed', { businessId: user.businessId, sale: savedSale });
  return savedSale;
});
```

### 4.2 `PATCH /api/sales/:id/refund`
```typescript
await this.dataSource.transaction(async (manager) => {
  const sale = await manager.findOne(Sale, {
    where: { id, businessId: user.businessId },
    relations: ['items'],
  });
  if (!sale) throw new NotFoundException('Sale not found');
  if (sale.status === 'refunded') throw new BadRequestException('Sale already refunded');

  // Restore inventory quantities
  for (const item of sale.items) {
    const product = await manager.findOne(InventoryItem, {
      where: { id: item.productId, businessId: user.businessId },
    });
    if (product) {
      product.quantity += item.quantity;
      product.sold = Math.max(0, product.sold - item.quantity);
      product.status = calculateStatus(product.quantity, product.reorderPoint);
      await manager.save(product);
    }
  }

  sale.status = 'refunded';
  sale.refundAmount = refundDto.refundAmount ?? sale.total;
  sale.refundReason = refundDto.refundReason;
  return await manager.save(sale);
});
```

---

## 5. Verification Checklist

- [ ] Sale creation fails if any product has insufficient stock (no partial deductions).
- [ ] Stock decrement and sale item records persist atomically.
- [ ] Refund restores product inventory counts and recalculates status.
- [ ] Sales history summary (`totalSales`, `totalTransactions`, `averageTransaction`) calculates correctly.
- [ ] Held transactions auto-calculate 24-hour expiration.
- [ ] `npm test sales.service.spec.ts` passes with 100% assertions.
