# LUXA Sales Master Documentation

Last updated: March 16, 2026
Scope: Unified reference for app pages, architecture, design system, colors, and structure.

## 1. Product Overview

LUXA Sales is a sales, inventory, analytics, and investor-management application for retail operations.

Core capabilities:

- Role-based access for owner, apprentice, and investor users
- Dashboard KPIs and operational summaries
- Inventory management and stock visibility
- Sales recording and transaction flow
- Analytics and reporting views
- Notifications and AI insights
- Investor and withdrawal workflows

## 2. Tech Stack

- Next.js App Router architecture (with src/app route structure)
- React + TypeScript
- Tailwind CSS + custom CSS variables
- shadcn/ui component system
- Framer Motion (animations)
- Recharts (visualizations)
- Lucide React (icons)

## 3. Route and Page Map

Primary app pages found under src/app:

- / -> src/app/page.tsx
- /dashboard -> src/app/dashboard/page.tsx
- /inventory -> src/app/inventory/page.tsx
- /inventory/[id] -> src/app/inventory/[id]/page.tsx
- /sales -> src/app/sales/page.tsx
- /analytics -> src/app/analytics/page.tsx
- /reports -> src/app/reports/page.tsx
- /insights -> src/app/insights/page.tsx
- /notifications -> src/app/notifications/page.tsx
- /data -> src/app/data/page.tsx
- /team -> src/app/team/page.tsx
- /profile -> src/app/profile/page.tsx
- /staff-profile -> src/app/staff-profile/page.tsx
- /settings -> src/app/settings/page.tsx

Auth pages:

- /auth/login -> src/app/auth/login/page.tsx
- /auth/signup -> src/app/auth/signup/page.tsx

Investor and withdrawals pages:

- /investors -> src/app/investors/page.tsx
- /investors/overview -> src/app/investors/overview/page.tsx
- /investors/[id] -> src/app/investors/[id]/page.tsx
- /investors/[id]/edit -> src/app/investors/[id]/edit/page.tsx
- /investors/[id]/withdrawals -> src/app/investors/[id]/withdrawals/page.tsx
- /withdrawals -> src/app/withdrawals/page.tsx
- /investor-dashboard -> src/app/investor-dashboard/page.tsx
- /investor-profile -> src/app/investor-profile/page.tsx
- /investor-insights -> src/app/investor-insights/page.tsx

## 4. Role and Access Model

High-level permission model:

- Owner: Full operational access, investor management, withdrawal management
- Apprentice: Operational access to daily business workflows
- Investor: Read-only access to investor-specific financial views

Key role-specific experiences:

- Owner: investors management, approval flows, complete business visibility
- Apprentice: inventory, sales, analytics, notifications
- Investor: investor dashboard, profit tracking, withdrawal status

## 5. Architecture Summary

Application layers:

- UI Layer: Route pages and reusable components
- State Layer: Context providers (auth, data, inventory, sales, notifications, UI)
- Data Layer: Local mock/typed datasets and utility transforms
- Service Layer: Utilities such as export and email config behavior

Notable flows:

- Investor profit flow: monthly records -> gross/net profit -> ownership share -> total profit and ROI
- Withdrawal flow: request created -> owner review -> approve/reject -> completion status reflected in investor views

## 6. Design System and Visual Language

### 6.1 Typography

Configured families:

- Inter for primary UI/body text
- Space Grotesk for display/headings
- Cairo for RTL scenarios

### 6.2 Theme Tokens (Light)

Extracted from src/index.css :root:

- --background: 220 20% 97%
- --foreground: 230 25% 15%
- --card: 0 0% 100%
- --primary: 230 45% 20%
- --secondary: 220 15% 92%
- --accent: 160 60% 45%
- --success: 160 60% 45%
- --warning: 38 92% 50%
- --destructive: 0 72% 55%
- --border: 220 15% 90%

Sidebar-specific tokens:

- --sidebar-background: 230 45% 15%
- --sidebar-foreground: 220 15% 85%
- --sidebar-primary: 160 60% 50%
- --sidebar-accent: 230 40% 22%

### 6.3 Theme Tokens (Dark)

Extracted from src/index.css .dark:

- --background: 230 25% 10%
- --foreground: 220 15% 95%
- --card: 230 25% 13%
- --primary: 160 60% 50%
- --secondary: 230 20% 18%
- --accent: 160 60% 45%
- --success: 160 60% 50%
- --warning: 38 92% 55%
- --destructive: 0 72% 50%

### 6.4 Utility Design Tokens

Also defined in src/index.css:

- Gradients: primary, accent, card, glow
- Shadows: sm, md, lg, glow
- Radius: --radius = 0.75rem

### 6.5 Tailwind Integration

tailwind.config.ts maps semantic colors to CSS variables:

- primary, secondary, accent, success, warning, destructive
- background/foreground, card/popover
- sidebar palette
- chart-1 to chart-5

It also defines:

- Container centered with 2rem padding and 1400px 2xl width
- Keyframes/animations: accordion, fade-in, slide-in-right, pulse-glow, count-up

## 7. Component and Folder Structure

High-level structure:

- src/app: page routes and layouts
- src/components: feature components and ui primitives
- src/contexts: app-wide state/context providers
- src/data: mock/reference datasets
- src/hooks: reusable hooks
- src/lib: utilities and service logic
- src/types: shared TypeScript types

Inventory export/email implementation-specific additions include:

- src/components/inventory/InventoryExportDialog.tsx
- src/components/inventory/DailyEmailSettingsDialog.tsx
- src/lib/inventoryExportUtils.ts
- src/lib/emailService.ts
- src/types/inventoryExportTypes.ts

## 8. Major Feature Groups

- Dashboard: KPIs, charts, insights
- Inventory: stock tracking, filters, list/grid views, export/email config dialogs
- Sales: transaction and cart workflows
- Analytics/Reports: trend and performance views
- Notifications: alert center and state management
- Investors: investor list/detail/edit and performance tracking
- Withdrawals: request lifecycle and status management

## 9. Source Documents Used for This Merge

This file consolidates information from:

- README.md
- ARCHITECTURE_DIAGRAM.md
- FILE_STRUCTURE_REFERENCE.md
- tailwind.config.ts
- src/index.css

## 10. Recommended Single Source Going Forward

Use this file as the primary app-level reference:

- APP_MASTER_DOCUMENTATION.md

If details change, update this file first and optionally keep the source-specific docs for deep technical notes.
