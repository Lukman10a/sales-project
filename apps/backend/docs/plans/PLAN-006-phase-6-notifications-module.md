# PLAN-006: Phase 6 — Event-Driven Notifications Module

- **Module**: Notifications System
- **Specification Reference**: [`SPEC-001 Section 4.5: Phase 6 Notifications Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#45-phase-6-notifications-module)
- **Status**: ✅ Implemented
- **Conventions**: This plan follows the guardrails from [`PLAN-001`](./PLAN-001-development-guardrails.md) and [`TDD_WORKFLOW.md`](../TDD_WORKFLOW.md). Every DTO is a **Zod schema + inferred type** applied via `ZodValidationPipe`; domain queries live in **colocated repositories**; services never import `typeorm`/`@nestjs/typeorm`; every logic unit — including the `listener` — has a **colocated `*.spec.ts`**; the full gate is **`npm run check`**.

---

## 1. Objectives

1. Build notification management endpoints (list with filters, unread count, mark read, delete, mark all read).
2. Create `NotificationsListener` that asynchronously handles `@OnEvent('inventory.low-stock')` and `@OnEvent('sale.completed')`.
3. Support notification filtering by `type` (`inventory`, `sale`, `alert`, `ai`, `system`) and `read` status.
4. Write unit tests for notification operations, event listeners, controller, and repository.

---

## 2. Files to Create & Modify

```
src/
├── notifications/
│   ├── dto/
│   │   └── query-notifications.dto.ts               # [NEW] Zod schema + inferred type (filter & pagination)
│   ├── notifications.repository.ts                  # [NEW] Colocated repository (extends Repository<Notification>)
│   ├── notifications.controller.ts                  # [NEW] Route handlers (ZodValidationPipe)
│   ├── notifications.service.ts                     # [NEW] Notification CRUD & mark read (no direct TypeORM)
│   ├── notifications.listener.ts                    # [NEW] EventEmitter listeners (@OnEvent)
│   ├── notifications.module.ts                      # [NEW] Module definition
│   ├── notifications.controller.spec.ts             # [NEW] Unit test suite (parity)
│   ├── notifications.service.spec.ts                # [NEW] Unit test suite
│   ├── notifications.repository.spec.ts             # [NEW] Unit test suite (parity)
│   └── notifications.listener.spec.ts               # [NEW] Unit test suite (parity)
└── app.module.ts                                    # [MODIFY] Register NotificationsModule
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Authenticated | List notifications, filter by type/read, unread count |
| `PATCH`| `/notifications/:id/read` | Authenticated | Mark individual notification as read |
| `DELETE`| `/notifications/:id` | Authenticated | Delete notification |
| `POST` | `/notifications/mark-all-read` | Authenticated | Mark all notifications as read for current user |

---

## 4. Event-Driven Listener Implementation

The listener delegates persistence to `NotificationsService` (which uses `NotificationsRepository`); the listener stays thin and is unit-tested with a mocked service. `metadata` is typed `Record<string, unknown>` (per PLAN-001 entity convention):

```typescript
@Injectable()
export class NotificationsListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('inventory.low-stock')
  async handleLowStockEvent(payload: { businessId: string; item: InventoryItem }) {
    await this.notificationsService.create({
      businessId: payload.businessId,
      userId: payload.item.createdBy,
      type: 'inventory',
      title: 'Low Stock Alert',
      message: `${payload.item.name} is running low on stock (${payload.item.quantity} remaining).`,
      metadata: { productId: payload.item.id, quantity: payload.item.quantity },
    });
  }

  @OnEvent('sale.completed')
  async handleSaleCompletedEvent(payload: { businessId: string; sale: Sale }) {
    await this.notificationsService.create({
      businessId: payload.businessId,
      userId: payload.sale.soldBy,
      type: 'sale',
      title: 'New Sale Recorded',
      message: `Sale #${payload.sale.id.slice(0, 8)} recorded for total ${payload.sale.total}.`,
      metadata: { saleId: payload.sale.id, total: payload.sale.total },
    });
  }
}
```

---

## 5. Verification Checklist

- [x] Notifications list returns both `data: Notification[]` and `unreadCount: number`.
- [x] Marking a notification as read updates `read: true`.
- [x] Mark-all-read sets all user notifications to `read: true`.
- [x] Emitting `inventory.low-stock` event generates a notification in the database.
- [x] Emitting `sale.completed` event generates a notification in the database.
- [x] All notification queries filtered by `businessId` (and `userId` where applicable).
- [x] Test parity holds (service, controller, repository, listener): `npm run check:tdd` reports 0 missing specs.
- [x] Full gate passes: `npm run check` (lint, typecheck, arch, parity, unit, e2e, build).
