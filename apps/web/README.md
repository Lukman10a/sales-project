# LUXA Sales - Modern Sales & Inventory Management System

**Version:** 0.0.0 | **Status:** In Development (MVP) | **Last Updated:** January 13, 2026

## 📋 About

LUXA Sales is a modern, full-featured sales and inventory management system designed for small to medium-sized retail businesses. The platform enables business owners and staff to efficiently manage inventory, record sales transactions, track analytics, and receive AI-powered business insights—all from an intuitive, fast, and beautiful interface.

### Key Capabilities

- **Multi-User Support:** Owner and Apprentice (staff) roles with tailored access levels
- **Real-Time Dashboard:** KPIs, sales trends, inventory status, and AI recommendations
- **Inventory Management:** Grid/List views, search, filtering, pricing, and stock tracking
- **Sales Recording:** Quick transaction entry, cart management, and price adjustments
- **Advanced Analytics:** Weekly trends, hourly patterns, category breakdowns, top products
- **AI Insights:** Smart recommendations for restocking, pricing, and inventory optimization
- **Notifications:** Centralized notification center with action-based alerts
- **Settings:** User preferences, notification configuration, and profile management

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm 9+

### Installation

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd luxa-sales

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will open at **http://localhost:3000**

### Available Commands

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Run production server
npm run lint     # Run ESLint code validation
```

---

## 🛠️ Tech Stack

### Frontend Framework & Libraries

- **Next.js 15** - React framework with App Router & Server Components
- **React 18** - UI library with hooks support
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework with custom design tokens
- **shadcn/ui** - 40+ accessible UI components built on Radix UI

### State Management & Forms

- **TanStack React Query (5.83.0)** - Server state, caching, and data synchronization
- **React Hook Form (7.61.1)** - Performant form state management
- **Zod** - TypeScript-first schema validation

### Visualization & Animation

- **Recharts (2.15.4)** - Composable charting library for analytics
- **Framer Motion (12.26.1)** - Production-ready motion library for animations
- **Lucide React (0.462.0)** - Beautiful, consistent icon library

### UI & UX

- **Sonner (1.7.4)** - Toast notifications system
- **next-themes (0.3.0)** - Dark/Light mode support
- **Radix UI Primitives** - Unstyled, accessible component primitives

### Development Tools

- **TypeScript (5.8.3)** - Type checking and IDE support
- **ESLint (9.32.0)** - Code quality and consistency
- **PostCSS & Autoprefixer** - CSS processing and vendor prefixes

---

## 📁 Project Structure

```
luxa-sales/
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Dashboard homepage
│   │   ├── providers.tsx         # Client providers (QueryClient, etc.)
│   │   ├── inventory/page.tsx    # Inventory management
│   │   ├── sales/page.tsx        # Sales recording
│   │   ├── analytics/page.tsx    # Analytics & reports
│   │   ├── notifications/page.tsx # Notification center
│   │   ├── insights/page.tsx     # AI insights
│   │   └── settings/page.tsx     # User settings
│   ├── components/
│   │   ├── layout/               # Layout components
│   │   │   ├── MainLayout.tsx    # App wrapper layout
│   │   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   │   └── Header.tsx        # Top header bar
│   │   ├── dashboard/            # Dashboard components
│   │   │   ├── StatCard.tsx
│   │   │   ├── SalesChart.tsx
│   │   │   ├── RecentSales.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── InventoryAlert.tsx
│   │   │   └── AIInsightCard.tsx
│   │   └── ui/                   # shadcn/ui components (40+)
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   └── utils.ts              # Utility functions
│   ├── pages/                    # Legacy page components (being migrated)
│   └── index.css                 # Global styles & design tokens
├── MEMORY_BANK.md                # Comprehensive project documentation
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS theme
├── postcss.config.js             # PostCSS configuration
├── components.json               # shadcn/ui configuration
└── package.json                  # Dependencies & scripts
```

---

## 🎨 Design System

### Color Palette

| Purpose     | Color      | HSL Value    |
| ----------- | ---------- | ------------ |
| Primary     | Navy Blue  | 230° 45% 20% |
| Accent      | Teal Green | 160° 60% 45% |
| Success     | Teal Green | 160° 60% 45% |
| Warning     | Orange     | 38° 92% 50%  |
| Destructive | Red        | 0° 72% 55%   |
| Background  | Light Gray | 220° 20% 97% |
| Card        | White      | 0° 0% 100%   |
| Sidebar     | Dark Navy  | 230° 45% 15% |

### Typography

- **Display Font:** Space Grotesk (Headers, titles)
- **Body Font:** Inter (Body text, UI elements)
- **Weights:** 300, 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (Extra Bold)

### Components

40+ shadcn/ui components including: Button, Card, Input, Select, Dialog, Alert, Badge, Tabs, Switch, Toast, and more.

---

## 📊 Features

### ✅ Implemented Features

#### Dashboard

- Key Performance Indicators (Sales, Items Sold, Stock, Profit Margin)
- Weekly sales chart with profit overlay
- Recent sales transaction list
- Low stock inventory alerts
- AI-powered insight recommendations
- Quick action shortcuts

#### Inventory Management

- Grid and List view layouts
- Product search and filtering
- Stock level indicators (In Stock, Low Stock, Out of Stock)
- Dual pricing display (Cost & Selling prices)
- Inventory confirmation workflow (for Apprentice role)
- Units sold tracking

#### Sales Recording

- Quick product selection interface
- Shopping cart with quantity adjustment
- Per-item custom pricing
- Recent sales history
- Transaction status tracking (Completed/Pending)
- Real-time total calculation

#### Analytics

- Weekly sales vs. profit comparison chart
- Hourly sales trend visualization
- Sales by category breakdown (pie chart)
- Top 5 performing products
- Date range filters (Today/Week/Month/Custom)
- Trend indicators with percentage changes

#### Notifications

- Centralized notification center
- Unread badge counter
- Mark as read/dismiss
- Action-based notifications
- Notification type filtering

#### AI Insights

- Smart restock recommendations with impact calculation
- Trending product identification
- Slow-moving inventory warnings
- Price optimization suggestions
- New product opportunity recommendations
- Priority-based categorization (High/Medium/Low)

#### Multi-User Features

- Owner role with full access (edit, delete, create)
- Apprentice role with limited access (view, confirm, record)
- Role-based UI visibility
- User profile display with role badges
- In-sidebar role switcher (for testing/demonstration)

---

### 🔲 Features Not Yet Implemented

**High Priority:**

- Product Add/Edit/Delete functionality
- Customer management system
- Transaction/Receipt detail pages
- Inventory reconciliation workflow

**Medium Priority:**

- Team/Staff user management
- Custom report generation & export
- Advanced user profile page
- Data backup & export

**Low Priority:**

- Dashboard widget customization
- Multi-language support
- Mobile app (React Native)
- Advanced audit logging

See [MEMORY_BANK.md](./MEMORY_BANK.md) for detailed roadmap.

---

## 👥 User Roles

### Owner

- Full access to all features
- Create, edit, delete products
- View all reports and analytics
- Manage staff and permissions
- Configure settings

### Apprentice (Staff)

- Limited inventory access (view only)
- Can record sales
- Can confirm received inventory
- View assigned reports
- Cannot delete or modify products

---

## 🔐 Authentication & Security

**Current Status:** Authentication system not yet implemented. Currently using mock user switching for development/testing.

**Future Implementation:** Will integrate with OAuth (Auth0/Google), NextAuth.js, or similar authentication provider.

---

## 🌐 Deployment

### Building for Production

```bash
npm run build
npm start
```

### Deployment Options

- **Vercel** - Recommended for Next.js (one-click deployment)
- **AWS (Amplify, EC2, ECS)**
- **Google Cloud (App Engine, Cloud Run)**
- **Self-hosted (VPS, Docker)**

---

## 📝 API Integration

**Current State:** All data is mock/hardcoded. Ready for API integration.

When connecting to a backend:

1. Define API endpoints and types
2. Use React Query hooks for data fetching
3. Implement error handling and loading states
4. Add pagination for large datasets
5. Set up environment variables for API URLs

---

## 🎯 Development Workflow

### Code Style

- **ESLint** configured for code consistency
- **TypeScript** with strict mode enabled
- **Prettier** formatting (via ESLint)

### Component Development Pattern

1. Use `"use client"` directive for interactive components
2. Prefer functional components with hooks
3. Extract reusable components to `src/components/`
4. Use shadcn/ui components as building blocks
5. Style with Tailwind CSS utilities

### Adding New Pages

1. Create folder in `src/app/` with `page.tsx`
2. Wrap with `"use client"` if using hooks
3. Import layout components
4. Add to Sidebar navigation if needed

---

## 📚 Documentation

For detailed project information, architecture, styling guidelines, and development notes, see:

- **[MEMORY_BANK.md](./MEMORY_BANK.md)** - Comprehensive project documentation

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

---

## 🐛 Known Issues

1. **Legacy Pages Directory:** Still exists alongside App Router. Migration in progress.
2. **Mock Data:** All data is hardcoded. Backend integration needed.
3. **Theme Toggle:** Dark mode CSS variables defined but no UI switcher yet.
4. **Sidebar State:** Collapsed state not persisted to localStorage.

---

## 💡 Contributing

When contributing to this project:

1. Create a feature branch from `main`
2. Follow the code style (TypeScript, Tailwind, shadcn/ui patterns)
3. Test thoroughly on desktop and mobile
4. Write clear commit messages
5. Submit pull request for review

---

## 📄 License

This project is private and proprietary to LUXA.

---

## 🤝 Support

For issues, questions, or feature requests, please refer to the [MEMORY_BANK.md](./MEMORY_BANK.md) documentation or create an issue in the repository.

---

**Built with ❤️ using Next.js, React, and Tailwind CSS**  
**Last Updated:** January 13, 2026
