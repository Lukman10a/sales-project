# Sidebar Sliding Issue - Detailed Research & Analysis

## Problem Summary

The sidebar is sliding in/animating every time you navigate to a different page, instead of remaining fixed while only the content area updates.

---

## Root Causes Identified

### 1. **MainLayout Re-instantiation on Route Navigation** ❌

**File**: [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx)

```tsx
const MainLayout = ({ children, requireRole }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);  // ❌ Resets on every route
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);      // ❌ Resets on every route
  const [isLargeScreen, setIsLargeScreen] = useState(false);        // ❌ Resets on every route
```

**Why this is the problem:**

- Every page route wraps its content with `<MainLayout>`
- When you navigate from `/dashboard` to `/inventory`, React unmounts the old MainLayout and mounts a new one
- This new instance has **fresh state** with `sidebarCollapsed = false`
- The Sidebar component in `Sidebar.tsx` animates based on `collapsed` prop, triggering the slide animation

### 2. **Animation Trigger on Main Content Margin** ❌

**File**: [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx#L50-L58)

```tsx
<main
  className="pt-20 pb-8 px-4 sm:px-6 lg:pt-24 min-h-screen"
  style={{
    marginLeft: isLargeScreen && !isRTL ? sidebarWidth : 0,
    marginRight: isLargeScreen && isRTL ? sidebarWidth : 0,
    transition: "margin 0.3s ease-in-out",  // ❌ Animates margin on state change
  }}
>
```

**What happens:**

- `sidebarWidth` is calculated from `sidebarCollapsed` state
- When the state resets, the margin changes from 280px → 280px but via fresh state
- The CSS transition triggers the visual animation effect

### 3. **Sidebar Position Animation** ❌

**File**: [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx#L115-L130)

```tsx
const sidebarAnimation = React.useMemo(
  () => ({
    width: collapsed ? 80 : 280,
    x: isLargeScreen ? 0 : mobileOpen ? 0 : isRTL ? 280 : -280,  // ❌ Animates position
  }),
  [collapsed, isLargeScreen, mobileOpen, isRTL],
);

return (
  <>
    <motion.aside
      initial={false}
      animate={sidebarAnimation}
      transition={{ duration: 0.3, ease: "easeInOut" }}  // ❌ Triggers on dependency change
```

**What happens:**

- The `sidebarAnimation` object is recalculated when dependencies change
- Each route change causes the Framer Motion animation to trigger
- Visual result: sidebar slides in from the left/right

### 4. **Screen Size Detection Re-runs on Navigation**

**File**: [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx#L25-L35)

```tsx
useEffect(() => {
  const checkScreenSize = () => {
    setIsLargeScreen(window.innerWidth >= 1024);
  };
  checkScreenSize(); // ❌ Runs on every mount
  window.addEventListener("resize", checkScreenSize);
  return () => window.removeEventListener("resize", checkScreenSize);
}, []); // ✅ Empty dependency (good), but runs on every new component instance
```

**Issue:**

- This effect runs every time MainLayout is mounted (which is on every route change)
- Creates multiple event listeners that aren't cleaned up from previous instances

---

## Architecture Flow - Why It's Happening

### Current (Broken) Pattern:

```
Page: /dashboard
  └─ MainLayout (Instance 1)
       ├─ Sidebar (collapsed: false) ← State A
       ├─ Header
       └─ Content

User clicks → Navigate to /inventory

Page: /inventory
  └─ MainLayout (Instance 2)  ← NEW INSTANCE, NEW STATE
       ├─ Sidebar (collapsed: false) ← Fresh state, animation triggers
       ├─ Header
       └─ Content
```

**Each route = new MainLayout instance = state resets = animations trigger**

---

## Detailed Component Interactions

### 1. Sidebar Component [src/components/layout/Sidebar.tsx]

- **Position**: `fixed top-0` with `z-50`
- **Animation**: Framer Motion animates width and x-position
- **Triggered by**: `collapsed` prop and `isLargeScreen` state
- **State dependencies**: Recalculates animation on every prop change

### 2. Header Component [src/components/layout/Header.tsx]

- **Position**: `fixed top-0` with `z-40`
- **Styling**: Uses inline style for `left` and `right` based on sidebar width

```tsx
style={{
  left: isLargeScreen ? (isRTL ? 0 : sidebarWidth) : 0,
  right: isLargeScreen ? (isRTL ? sidebarWidth : 0) : 0,
  transition: "left 0.3s ease-in-out, right 0.3s ease-in-out",  // ❌ Animates
}}
```

### 3. Main Content [src/components/layout/MainLayout.tsx]

- **Margin adjusts** based on sidebar state
- **Transition** set to `0.3s ease-in-out`
- **Recalculates** on every route change

---

## Why Using `React.memo()` Doesn't Fix It

Both Sidebar and MainLayout use `React.memo()`:

```tsx
export default React.memo(MainLayout);
export default React.memo(Sidebar);
```

**This doesn't help because:**

- `React.memo` prevents re-renders if props haven't changed
- But it **doesn't prevent component unmounting** when navigating between routes
- When you navigate, the entire MainLayout component is **destroyed and recreated**
- memo() only helps within the same component instance

---

## State Persistence Issue

### Sidebar State Location:

```
MainLayout.jsx (state lives here)
  └─ sidebarCollapsed ← Lost on route change
  └─ mobileMenuOpen ← Lost on route change
```

### Ideal State Location:

```
Global Context or Root Layout
  └─ sidebarCollapsed ← Persists across routes
  └─ Route change happens, MainLayout stays, state preserved
```

---

## Event Listener Leak

**File**: [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx#L25-L35) and [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx#L102-L110)

Both components add resize listeners:

- MainLayout adds listener
- Sidebar adds listener
- On route change, old listeners persist (cleanup only on unmount)
- New route adds new listeners
- **Result**: Multiple listeners, potential memory leak

---

## Visual Timeline of What Happens

```
Time 0: User on /dashboard
└─ MainLayout mounts with sidebarCollapsed=false, isLargeScreen=true

Time 0.1s: User clicks /inventory link

Time 0.15s: /inventory page renders
└─ MainLayout UNMOUNTS (old instance destroyed, old state lost)
└─ MainLayout MOUNTS (new instance, fresh state)
└─ sidebarAnimation re-evaluates → triggers Framer Motion

Time 0.15-0.45s: Animation plays
└─ Sidebar slides in via Framer Motion animation (300ms duration)
└─ Header left/right properties animate
└─ Main content margin animates

Time 0.45s: Animation complete, page fully stable
```

---

## Summary of Issues

| Issue                      | Location       | Severity    | Impact                               |
| -------------------------- | -------------- | ----------- | ------------------------------------ |
| State reset on route       | MainLayout.tsx | 🔴 Critical | Sidebar animates on every navigation |
| Animation on margin change | MainLayout.tsx | 🔴 Critical | Content slides and header shifts     |
| Animation on Sidebar       | Sidebar.tsx    | 🔴 Critical | Sidebar slides in from position      |
| Header margin animation    | Header.tsx     | 🟠 High     | Header shifts position               |
| Event listener leak        | both files     | 🟡 Medium   | Memory accumulation over time        |
| Re-running screen check    | both files     | 🟡 Medium   | Unnecessary state updates            |

---

## Next Steps to Fix

The solution requires one of these approaches:

1. **Use a Global Context** - Store sidebar state in AuthContext or new UIContext
2. **Use Next.js Root Layout** - Wrap app with single layout instance that doesn't remount
3. **Local Storage** - Persist state for restoration (temporary fix)
4. **Remove Animations** - Use CSS class changes instead of Framer Motion transitions

Recommend: **Approach #2 (Next.js Root Layout)** for proper fix.
