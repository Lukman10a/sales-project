# LUXA Sales - Dashboard Redesign Master Plan

## 1. Design Philosophy

To ensure the redesign is **not random**, we will follow a strict "Modern Clean Enterprise" aesthetic.

- **Colors:** Move away from heavy gradients and overly saturated colors. Use a refined, high-contrast, neutral palette (like Slate or Zinc) with ONE deliberate primary accent color (e.g., a deep, trusted Navy or an energetic, modern Teal).
- **Typography:** Maintain `Inter` for highly legible data/tables and `Space Grotesk` for sharp, modern display headers. We will increase whitespace and use strict typography hierarchy (fewer font sizes, better weights).
- **Components:** Flat, borderless cards with subtle background fills rather than heavy drop shadows. Glassmorphism used strictly sparingly (only for floating elements like notifications or dropdowns).
- **Density:** Adjustable density. Clean views with plenty of breathing room, utilizing slide-outs (sheets) instead of stacking too many modals.

---

## 2. Comprehensive Pages & Functionalities List

### Core Role & Authentication

- **`/auth/login` & `/signup`**: User authentication, role selection.
- **`/profile` & `/staff-profile`**: Personal info, credential management.
- **`/team`**: Owner view to manage staff/apprentices.

### Main Business Operations (Owner & Apprentice)

- **`/` (Dashboard)**: Daily KPI summary, low stock alerts, quick actions, recent sales.
- **`/inventory`**: View stock, filters (grid/list), add/edit items, export to CSV/HTML, configure daily email schedules.
- **`/inventory/[id]`**: Deep dive into single product history, pricing, and stock adjustments.
- **`/sales`**: Point-of-Sale (POS) interface, cart management, instant checkout, custom pricing.

### Analytics & Intelligence

- **`/analytics`**: In-depth charts (Recharts), weekly vs. monthly trends, category breakdowns.
- **`/reports`**: Tabular and exportable performance data.
- **`/insights`**: AI-driven tips, restock recommendations, pricing adjustments.

### Investor Management (Owner Only)

- **`/investors` & `/investors/overview`**: Master list of active investors, equity %, total invested.
- **`/investors/[id]` & `/investors/[id]/edit`**: Specific investor historical performance and profile editing.
- **`/investors/[id]/withdrawals`**: Individual withdrawal history.
- **`/withdrawals`**: Global withdrawal request management (Approve/Reject workflows).

### Investor Portal (Investor Only)

- **`/investor-dashboard`**: Read-only overview of their personal ROI, equity split, and profit chart.
- **`/investor-profile` & `/investor-insights`**: Personal settings and tailored updates.

### Global & Utility

- **`/settings`**: App preferences, default language, receipt settings.
- **`/notifications`**: System alerts (stock thresholds, new investments, withdrawals).
- **`/data`**: System data management/backups.

---

## 3. Phased Redesign Execution Plan

By isolating the work into sequential phases, we ensure nothing breaks and the new design language scales naturally across the app.

### Phase 1: The Foundation & Global Layout (Architecture & Tokens)

_Refining the canvas before touching the data._

1. **Design Tokens Update:** Update `tailwind.config.ts`, `index.css`, and Shadcn UI configurations to the new "Modern Minimal" palette. Fix shadowing, border radiuses (`--radius`), and remove legacy gradients.
2. **Global Layout Wrapper:** Redesign the `<MainLayout />`, `<Header />`, and `<Sidebar />`.
   - _Sidebar_: Make it sleek, perhaps collapsible, with clean active-state highlights.
   - _Header_: Clean up the breadcrumbs, user avatar, and notification bell placement.
3. **Typography Standardization:** Audit global CSS to ensure headings (`Space Grotesk`) and data (`Inter`) are perfectly scaled.

### Phase 2: Core Dashboard & Auth (The First Impression)

_Perfecting what the user sees on day one._

1. **Auth Pages (`/auth/*`)**: Clean, split-screen or centered-card aesthetic with crisp inputs.
2. **Main Dashboard (`/`)**:
   - Transition `StatCards` from glowing/heavy styles to flat, clean, metric-focused cards with subtle trend arrows (e.g., `+12%`).
   - Redesign the Sales Chart to have minimal gridlines, smooth curves, and clean tooltips.
   - Clean up "Recent Sales" and "Low Stock" lists into modern, borderless-row tables.

### Phase 3: High-Density Operations (Inventory & Sales)

_Focusing on UX, data density, and speed._

1. **Sales POS (`/sales`)**: Redesign the checkout flow. Make the cart a prominent sticky right-sidebar or a sleek slide-out. Make product selection visually distinct.
2. **Inventory Manager (`/inventory`)**:
   - Overhaul the data table (using Shadcn Data Table / TanStack table standards).
   - Refine the Grid view to look like modern e-commerce catalogs.
   - Redesign the Export & Email Settings Dialogs to be stepped/tabbed rather than overwhelming long forms.
3. **Product Details (`/inventory/[id]`)**: Create a "Profile" layout for products with visual hierarchy (Image/SKU top left, stats right, history bottom).

### Phase 4: Data Visualization & AI (Analytics & Insights)

_Making data look beautiful and actionable._

1. **Analytics (`/analytics`, `/reports`)**: Standardize chart tooltips, colors (tie to primary/accent tokens), and legendary layouts.
2. **AI Insights (`/insights`)**: Use soft, contextual highlighting (e.g., gentle blue/purple pastel background cards) to differentiate AI suggestions from hard data.

### Phase 5: The Investor Ecosystem

_Adding a premium feel for financial stakeholders._

1. **Owner Management (`/investors`, `/withdrawals`)**: Clean list views, status badges (e.g., soft green for Approved, soft amber for Pending).
2. **Investor Dashboard (`/investor-dashboard`)**: Very clean, finance-app inspired layout (think Robinhood/Stripe web dashboards). Big clear numbers, beautiful smooth charts.

### Phase 6: Polish, Mobile & Secondary Views

_Tying up loose ends._

1. **Settings & Profiles (`/settings`, `/profile`)**: Clean form layouts, aligned input clusters.
2. **Notifications (`/notifications`)**: A structured chronological feed.
3. **Responsiveness Audit**: Ensure Mobile layouts for Sidebar (Hamburger) and Data Tables fold gracefully.
