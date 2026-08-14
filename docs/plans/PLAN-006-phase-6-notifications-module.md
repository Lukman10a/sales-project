# PLAN-006: Phase 6 — Event-Driven Notifications Module

- **Module**: Notifications System
- **Specification Reference**: [`SPEC-001 Section 4.5: Phase 6 Notifications Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#45-phase-6-notifications-module)
- **Status**: ⏳ Pending Implementation

---

## 1. Objectives

1. Build notification management endpoints (list with filters, unread count, mark read, delete, mark all read).
2. Create `NotificationsListener` that asynchronously handles `@OnEvent('inventory.low-stock')` and `@OnEvent('sale.completed')`.
3. Support notification filtering by `type` (`inventory`, `sale`, `alert`, `ai`, `system`) and `read` status.
4. Write unit tests for notification operations and event listeners.

---

## 2. Files to Create & Modify

```
src/
├── notifications/
│   ├── dto/
│   │   └── query-notifications.dto.ts               # [NEW] Filter and pagination DTO
│   ├── notifications.controller.ts                  # [NEW] Route handlers
│   ├── notifications.service.ts                     # [NEW] Notification CRUD & mark read
│   ├── notifications.listener.ts                    # [NEW] EventEmitter listeners
│   ├── notifications.module.ts                      # [NEW] Module definition
│   └── notifications.service.spec.ts                # [NEW] Unit test suite
└── app.module.ts                                    # [MODIFY] Register NotificationsModule
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Authenticated | List notifications, filter by type/read, unread count |
| `PATCH`| `/api/notifications/:id/read` | Authenticated | Mark individual notification as read |
| `DELETE`| `/api/notifications/:id` | Authenticated | Delete notification |
| `POST` | `/api/notifications/mark-all-read` | Authenticated | Mark all notifications as read for current user |

---

## 4. Event-Driven Listener Implementation

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

- [ ] Notifications list returns both `data: Notification[]` and `unreadCount: number`.
- [ ] Marking a notification as read updates `read: true`.
- [ ] Mark-all-read sets all user notifications to `read: true`.
- [ ] Emitting `inventory.low-stock` event generates a notification in the database.
- [ ] Emitting `sale.completed` event generates a notification in the database.
- [ ] `npm test notifications.service.spec.ts` passes.
