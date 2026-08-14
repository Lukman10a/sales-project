# PLAN-005: Phase 5 — Analytics & Dashboard Module

- **Module**: Analytics & Dashboard Reporting
- **Specification Reference**: [`SPEC-001 Section 4.4: Phase 5 Analytics Module`](file:///C:/Users/Abdulrauf%20Lukman/Desktop/LUXA/sales-backend/docs/specifications/SPEC-001-sales-backend-spec.md#44-phase-5-analytics-module)
- **Status**: ⏳ Pending Implementation

---

## 1. Objectives

1. Build `GET /api/dashboard` returning comprehensive overview metrics, inventory breakdown, recent sales, and low-stock alerts.
2. Implement `GET /api/analytics/summary` with period filtering (`today`, `week`, `month`) and period-over-period percentage trend comparisons.
3. Implement `GET /api/analytics/sales-chart` generating time-bucketed series (hourly for today, daily for week, weekly for month).
4. Implement `GET /api/analytics/category-breakdown` aggregating revenue and order counts per product category.
5. Implement `GET /api/analytics/top-products` ranking top selling products by units sold and revenue.
6. Write unit tests for all mathematical formulas, date boundaries, and aggregation queries.

---

## 2. Files to Create & Modify

```
src/
├── analytics/
│   ├── dto/
│   │   └── analytics-query.dto.ts                   # [NEW] Period & date filter validation
│   ├── analytics.controller.ts                      # [NEW] Dashboard and analytics endpoints
│   ├── analytics.service.ts                         # [NEW] Aggregations and trend calculations
│   ├── analytics.module.ts                          # [NEW] Module definition
│   └── analytics.service.spec.ts                    # [NEW] Unit test suite
└── app.module.ts                                    # [MODIFY] Register AnalyticsModule
```

---

## 3. Endpoints & Route Contracts

| Method | Endpoint | Permissions / Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard` | `owner` \| `manager` | High-level metrics, inventory counts, top products, recent sales |
| `GET` | `/api/analytics/summary` | `owner` \| `manager` | Revenue, orders, net profit, trend percentage changes |
| `GET` | `/api/analytics/sales-chart`| `owner` \| `manager` | Time-bucketed series for chart visualizations |
| `GET` | `/api/analytics/category-breakdown` | `owner` \| `manager` | Grouped sales breakdown by category |
| `GET` | `/api/analytics/top-products` | `owner` \| `manager` | Top selling products ranked by revenue & units |

---

## 4. Aggregation Logic & Mathematical Formulas

1. **Net Profit**:
   - Query completed sales and join with `SaleItem` and `InventoryItem`:
     $$\text{Net Profit} = \sum (\text{item.price} - \text{product.wholesalePrice}) \times \text{item.quantity}$$
2. **Trend Percentage Calculation**:
   ```typescript
   function calculatePercentageChange(current: number, previous: number): number {
     if (previous === 0) return current > 0 ? 100 : 0;
     const change = ((current - previous) / previous) * 100;
     return Math.round(change * 10) / 10;
   }
   ```
3. **Period Boundaries**:
   - `today`: Current date 00:00:00 to 23:59:59 vs yesterday.
   - `week`: Last 7 days vs previous 7 days.
   - `month`: Last 30 days vs previous 30 days.
4. **Time Series Bucketing**:
   - `today-hourly`: 24 hour buckets for today.
   - `week-daily`: 7 day buckets for the past week.
   - `month-weekly`: 4 week buckets for the past month.

---

## 5. Verification Checklist

- [ ] All aggregate queries enforce `where: { businessId: user.businessId }`.
- [ ] Trends calculate properly without division-by-zero runtime exceptions.
- [ ] Category breakdown aggregates multi-category products accurately.
- [ ] Top products returns top performers sorted in descending order of revenue/units.
- [ ] `npm test analytics.service.spec.ts` passes.
