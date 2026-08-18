# LUXA Sales - Project Memory Bank

**Project Name:** LUXA Sales  
**Version:** 0.0.0  
**Framework:** Next.js 15 with App Router  
**Created:** January 13, 2026  
**Language:** TypeScript  
**Styling:** Tailwind CSS + shadcn/ui

---

## Project Overview

LUXA Sales is a modern, full-featured sales and inventory management system designed for small to medium-sized businesses. The application supports multi-user functionality with role-based access control (Owner vs Apprentice) and provides real-time analytics, AI-powered business insights, and comprehensive inventory management.

**Primary Use Case:** Managing retail/e-commerce inventory, recording sales transactions, tracking analytics, and providing business intelligence for owners and staff.

---

## Architecture & Technology Stack

### Core Technologies

- **Frontend Framework:** Next.js 15.1.6 (App Router - Server Components + Client Components)
- **UI Library:** React 18.3.1
- **Language:** TypeScript 5.8.3
- **Styling:** Tailwind CSS 3.4.17 with custom design tokens
- **Component Library:** shadcn/ui (Radix UI primitives)
- **State Management:** TanStack React Query 5.83.0
- **Forms:** React Hook Form 7.61.1 + Zod validation
- **Animation:** Framer Motion 12.26.1
- **Charts/Visualization:** Recharts 2.15.4
- **Notifications:** Sonner 1.7.4 (Toast notifications)
- **Icons:** Lucide React 0.462.0
- **Theme Support:** next-themes 0.3.0

### Development Dependencies

- **Linting:** ESLint 9.32.0 with Next.js config
- **CSS Processing:** PostCSS 8.5.6, Autoprefixer 10.4.21
- **Type Utilities:** @types/estree, @types/node, @types/react, @types/react-dom

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Dashboard (home page)
│   ├── providers.tsx            # Client providers (QueryClient, etc.)
│   ├── inventory/page.tsx       # Inventory management
│   ├── sales/page.tsx           # Sales recording & tracking
│   ├── analytics/page.tsx       # Analytics & reports
│   ├── notifications/page.tsx   # Notification center
│   ├── insights/page.tsx        # AI insights & recommendations
│   └── settings/page.tsx        # Settings & preferences
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx       # Main app layout wrapper
│   │   ├── Sidebar.tsx          # Navigation sidebar with role switcher
│   │   ├── Header.tsx           # Top header with search & profile
│   ├── dashboard/
│   │   ├── StatCard.tsx         # KPI stat cards
│   │   ├── SalesChart.tsx       # Weekly sales chart
│   │   ├── RecentSales.tsx      # Recent transactions list
│   │   ├── QuickActions.tsx     # Quick action buttons
│   │   ├── InventoryAlert.tsx   # Low stock alerts
│   │   └── AIInsightCard.tsx    # AI recommendation cards
│   ├── ui/                      # shadcn/ui components (40+ components)
│   │   ├── button.tsx, card.tsx, input.tsx, badge.tsx, etc.
│   │   ├── toaster.tsx          # Toast notifications
│   │   ├── sonner.tsx           # Sonner toast wrapper
│   │   └── [other UI primitives]
├── hooks/
│   ├── use-toast.ts             # Toast notification hook
│   └── use-mobile.tsx           # Mobile detection hook
├── lib/
│   └── utils.ts                 # Utility functions (cn for classname merging)
├── pages/                       # Legacy page components (being wrapped by App Router)
│   ├── Dashboard.tsx
│   ├── Inventory.tsx
│   ├── Sales.tsx
│   ├── Analytics.tsx
│   ├── Notifications.tsx
│   ├── AIInsights.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
├── index.css                    # Global styles & CSS variables
└── vite-env.d.ts               # Vite types (legacy, can be removed)

Config Files:
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # Tailwind CSS theme & colors
├── postcss.config.js           # PostCSS configuration
├── components.json             # shadcn/ui CLI configuration
├── .eslintrc.json             # ESLint configuration
└── index.html                  # HTML entry point
```

---

## Design System

### Color Palette

- **Primary:** Dark Navy Blue (#1F2B3C) - Main brand color
- **Accent:** Teal Green (#4FBD9A) - Highlights & CTAs
- **Success:** Same as Accent (#4FBD9A)
- **Warning:** Orange (#FFA500)
- **Destructive:** Red (#D94242)
- **Background:** Light Gray (#F7F9FC)
- **Card/Surface:** Pure White (#FFFFFF)
- **Sidebar:** Dark Navy (#1A1F2E) with custom sidebar color scheme

### Typography

- **Display Font:** Space Grotesk (Headers, titles)
- **Body Font:** Inter (Body text, UI)
- **Font Sizes:** Follow standard Tailwind scale

### Design Tokens (CSS Variables)

- Custom HSL color variables for light/dark mode support
- Gradient variables for buttons and cards
- Shadow utilities (sm, md, lg, glow)
- Border radius: 0.75rem (12px) default

### Components

- **40+ shadcn/ui components** fully configured and ready to use
- Radix UI primitive-based for accessibility
- Custom styling through Tailwind CSS

---

## Features Implemented

### ✅ Core Features

1. **Dashboard**

   - KPI statistics (Today's Sales, Items Sold, In Stock, Profit Margin)
   - Weekly sales chart with profit overlay
   - Recent sales list with status badges
   - Inventory alerts (low stock, out of stock)
   - AI insight cards with recommendations
   - Quick action buttons for common tasks

2. **Inventory Management**

   - View products in grid or list layout
   - Search and filter functionality
   - Stock level indicators (In Stock, Low Stock, Out of Stock)
   - Product pricing (wholesale & selling prices)
   - Edit/Delete product buttons (Owner only)
   - Apprentice inventory confirmation feature
   - Units sold tracking

3. **Sales Recording**

   - Quick product selection from grid
   - Shopping cart with quantity adjustment
   - Custom price adjustment per item
   - Recent sales history with filters
   - Sale status tracking (Completed/Pending)
   - Real-time total calculation

4. **Analytics**

   - Weekly sales vs profit comparison
   - Hourly sales trends
   - Sales by category (pie chart)
   - Top performing products ranking
   - Date range filtering (Today/Week/Month/Custom)
   - Key metrics with trend indicators

5. **Notifications**

   - Notification center with filtering
   - Unread badge counter
   - Mark as read/dismiss functionality
   - Action-based notifications
   - Multiple notification types (Inventory, Sale, Alert, AI)

6. **AI Insights**

   - Smart restock recommendations
   - Trending product identification
   - Slow-moving inventory warnings
   - Price optimization suggestions
   - New product opportunity recommendations
   - Priority-based insight categorization

7. **Settings**
   - Profile settings section (placeholder)
   - Notification preferences
   - Security settings (placeholder)
   - Appearance/Theme (placeholder)
   - Data & Backup (placeholder)
   - Help & Support (placeholder)

### ✅ Multi-User Features

1. **Role-Based Access**

   - Owner: Full access (edit, delete, add products)
   - Apprentice: Limited access (view, confirm inventory, record sales)
   - Role switcher in sidebar for testing

2. **User Identification**
   - Owner profile: Ahmed Hassan (Super Admin)
   - Apprentice profile: Ibrahim Musa (Admin)
   - Avatar display in header
   - Role badge in profile area

---

## Missing Features (To Be Implemented)

### High Priority

1. **Product Management**

   - Add New Product page (`/inventory/new`)
   - Edit Product page (`/inventory/:id`)
   - Delete product functionality

2. **Transaction Details**

   - Transaction/Receipt detail page (`/sales/:id`)
   - Print receipt functionality
   - Refund management

3. **Customer Management**

   - Customer list page (`/customers`)
   - Customer detail/history page
   - Customer creation/editing

4. **Inventory Reconciliation**
   - Stock verification page
   - Discrepancy resolution
   - Inventory audit trail

### Medium Priority

5. **Team/User Management**

   - Team member list (`/team`)
   - Add/Edit staff users
   - Permission management
   - Activity logging

6. **Reports & Export**

   - Custom report generation (`/reports`)
   - Export to CSV/PDF
   - Schedule report emails

7. **Profile & Account**
   - Detailed profile page (`/profile`)
   - Account settings
   - Password change
   - Preferences

### Low Priority

8. **Data Management**

   - Backup functionality
   - Data import/export
   - Database management

9. **Dashboard Customization**
   - Widget selection
   - Layout customization
   - Default view preferences

---

## Styling & Theme

### Light Mode (Default)

- Background: #F7F9FC (Light gray)
- Foreground: #1E1F3C (Dark blue)
- Cards: Pure white with subtle shadows
- Sidebar: Dark navy (#1A1F2E)

### Dark Mode

- Background: #0A0E18 (Very dark blue)
- Foreground: #E8EDEF (Light gray)
- Cards: Dark navy with subtle shadows
- Sidebar: Slightly lighter dark navy

### Custom CSS Classes

- `.bg-gradient-primary` - Dark navy to lighter navy gradient
- `.bg-gradient-accent` - Teal green gradient
- `.glow-accent` - Teal glow effect on buttons
- `.card-elevated` - Elevated card shadow style
- `.card-hover` - Hover effect for cards
- `.font-display` - Use Space Grotesk font
- `.font-sans` - Use Inter font

---

## State Management & Data Flow

### Client-Side State

- **React Query (TanStack):** For server state & API caching
- **React Hooks:** Local component state (useState, useEffect)
- **React Hook Form:** Form state & validation

### Data Flow Patterns

1. Pages are wrapped as "use client" components
2. MainLayout provides user role state
3. Dashboard/Pages maintain local state with useState
4. Components receive props from parent pages
5. No global state management (Redux/Zustand) currently

---

## Navigation & Routing

### Main Routes

- `/` → Dashboard (Home)
- `/inventory` → Inventory Management
- `/sales` → Sales Recording
- `/analytics` → Analytics & Reports
- `/notifications` → Notification Center
- `/insights` → AI Insights
- `/settings` → Settings

### Sidebar Navigation Items

- Dashboard (Badge count: N/A)
- Inventory (Package icon)
- Sales (ShoppingCart icon)
- Analytics (BarChart3 icon)
- Notifications (Bell icon, Badge: 3)
- AI Insights (Sparkles icon)
- Settings (Settings icon, bottom)
- Logout (LogOut icon, bottom)

### Navigation Implementation

- Using Next.js `Link` component (not React Router)
- `usePathname()` from `next/navigation` for active route detection
- Sidebar collapse animation (280px → 80px)

---

## Performance Considerations

### Optimizations Implemented

1. **Image Optimization:** Using next/image (implicit)
2. **Code Splitting:** App Router automatic splitting per route
3. **Font Optimization:** Google Fonts via next/font with variable fonts
4. **React Query:** Built-in caching & deduplication
5. **Framer Motion:** GPU-accelerated animations
6. **CSS Modules:** Tailwind purges unused styles

### Potential Improvements

1. Add Image component with lazy loading
2. Implement service worker for offline support
3. Database integration (currently mock data)
4. API endpoint mocking/integration
5. Incremental Static Regeneration (ISR)

---

## Development Workflow

### Commands

```bash
npm run dev     # Start development server (localhost:3000)
npm run build   # Build for production
npm start       # Start production server
npm run lint    # Run ESLint
```

### Key Development Notes

1. All components use "use client" where React hooks are needed
2. PostCSS config uses CommonJS (module.exports) not ES modules
3. CSS variables are scoped in :root and .dark
4. Tailwind config includes both ./src paths and legacy ./pages
5. Type safety enabled with strict TypeScript config

---

## Authentication & Authorization

### Current Implementation

- **No backend authentication** (mock implementation)
- Role switching via sidebar toggle (Owner/Apprentice)
- Role-based UI rendering (some buttons/fields hidden based on role)

### Future Implementation Needed

- Authentication provider (Auth0, NextAuth, Firebase, etc.)
- JWT token storage
- Protected routes middleware
- Session management
- Logout functionality

---

## API Integration

### Current State

- **No backend connected** - All data is mock/hardcoded
- Uses TanStack React Query for state management
- Ready for API integration

### When Integrating APIs:

1. Replace hardcoded data with API calls
2. Use React Query hooks (useQuery, useMutation)
3. Implement proper error handling
4. Add loading states
5. Implement pagination/infinite scroll where needed

---

## Known Issues & Notes

1. **Legacy Pages Directory:** Still exists alongside App Router. Should migrate wrapper pages to full App Router pages.
2. **Mock Data:** All data is hardcoded. No database/API connected.
3. **Theme Switcher:** Dark mode theme variables defined but no UI switcher in Header yet.
4. **Sidebar Collapse:** Animation works but doesn't save collapsed state to localStorage.
5. **Settings Page:** Most sections show "Coming Soon" placeholder.

---

## Environment Setup

### Requirements

- Node.js 18+ (uses nvm)
- npm 9+

### Installation

```bash
npm install
```

### Configuration Files

- `.env.local` - Not required yet, will be needed for API keys/database URLs

---

## Git & Version Control

- Repository: LUXA Sales (Next.js)
- Removed all Lovable references (Jan 13, 2026)
- Main branch active
- Ready for feature branches

---

## Future Roadmap

### Phase 1 (MVP)

- [ ] Product Add/Edit/Delete
- [ ] Customer Management
- [ ] Transaction Details/Receipts
- [ ] Basic authentication

### Phase 2

- [ ] Backend API integration
- [ ] Database setup (PostgreSQL/MongoDB)
- [ ] User team management
- [ ] Advanced reporting

### Phase 3

- [ ] Mobile app (React Native)
- [ ] Real-time sync
- [ ] Advanced AI features
- [ ] Multi-language support

---

## Support & Documentation

- **shadcn/ui Docs:** https://ui.shadcn.com
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind Docs:** https://tailwindcss.com/docs
- **React Query Docs:** https://tanstack.com/query

---

**Last Updated:** January 13, 2026  
**Created By:** Development Team  
**Project Status:** In Development (MVP Phase)
