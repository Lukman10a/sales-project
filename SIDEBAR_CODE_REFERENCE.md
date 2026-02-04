# Sidebar Sliding Issue - Code Reference Guide

## Quick Reference: Problem Locations

### File 1: MainLayout.tsx

**Path**: [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx)

#### Problem 1: State Reset on Route Change (Lines 18-20)

```typescript
// 🔴 STATE RESETS ON EVERY ROUTE CHANGE
const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Line 18
const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Line 19
const [isLargeScreen, setIsLargeScreen] = useState(false); // Line 20
```

**Why it's a problem:**

- When you navigate between pages, each page has its own `<MainLayout>` component
- React creates a NEW instance of MainLayout with fresh state
- State initializes to default values (`false`)
- This doesn't match the previous sidebar state

**Impact:** Sidebar state resets → triggers animations

---

#### Problem 2: Sidebar Width Recalculation (Line 21)

```typescript
const sidebarWidth = sidebarCollapsed ? 80 : 280; // Line 21
```

**Why it's a problem:**

- Depends on `sidebarCollapsed` state
- When state resets, this recalculates
- Main content margin depends on this value

**Impact:** Margin change triggers animation

---

#### Problem 3: Main Content Margin Animation (Lines 50-58)

```typescript
<main
  className="pt-20 pb-8 px-4 sm:px-6 lg:pt-24 min-h-screen"
  style={{
    marginLeft: isLargeScreen && !isRTL ? sidebarWidth : 0,        // Line 54
    marginRight: isLargeScreen && isRTL ? sidebarWidth : 0,        // Line 55
    transition: "margin 0.3s ease-in-out",  // ⚠️ LINE 56 - CSS ANIMATION
  }}
>
```

**Why it's a problem:**

- CSS transition is set to animate margin changes
- When `sidebarWidth` recalculates (even if same value), animation triggers
- Browser sees margin value "changing" and animates it

**Impact:** Content slides on route navigation

---

#### Problem 4: isLargeScreen Effect (Lines 25-35)

```typescript
useEffect(() => {
  const checkScreenSize = () => {
    setIsLargeScreen(window.innerWidth >= 1024); // Line 27
  };

  checkScreenSize(); // Line 30 - Runs on mount
  window.addEventListener("resize", checkScreenSize);
  return () => window.removeEventListener("resize", checkScreenSize);
}, []); // Empty deps = runs on EVERY mount
```

**Why it's a problem:**

- Effect runs every time MainLayout mounts (every route change)
- Creates new event listeners
- Old listeners from previous routes aren't cleaned up properly

**Impact:** Multiple listeners, potential memory leak, state updates trigger animations

---

### File 2: Sidebar.tsx

**Path**: [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)

#### Problem 5: Animation Dependency Memoization (Lines 115-122)

```typescript
const sidebarAnimation = React.useMemo(
  () => ({
    width: collapsed ? 80 : 280, // Line 118
    x: isLargeScreen ? 0 : mobileOpen ? 0 : isRTL ? 280 : -280, // Line 119
  }),
  [collapsed, isLargeScreen, mobileOpen, isRTL], // Line 121
);
```

**Why it's a problem:**

- When `isLargeScreen` state changes (on mount), memo recalculates
- Animation object is a new object reference
- Framer Motion sees value change and triggers animation

**Impact:** Sidebar animates on route change

---

#### Problem 6: Framer Motion Animation (Lines 132-141)

```typescript
<motion.aside
  initial={false}              // Line 133 - Good, but...
  animate={sidebarAnimation}   // Line 134 - Triggers on dependency change
  transition={{
    duration: 0.3,            // Line 136
    ease: "easeInOut" }}      // Line 137
  className={cn(
    "fixed top-0 h-screen bg-sidebar flex flex-col shadow-2xl",  // Line 139
    "lg:shadow-none",
    "z-50",
    isRTL ? "right-0" : "left-0",  // Line 142
  )}
>
```

**Why it's a problem:**

- `animate={sidebarAnimation}` triggers Framer Motion animation
- When `sidebarAnimation` object reference changes (on route), animation plays
- Even if values are the same, animation still triggers

**Impact:** Sidebar slides in from the edge

---

#### Problem 7: isLargeScreen Effect (Lines 102-110)

```typescript
React.useEffect(() => {
  const checkScreenSize = () => {
    setIsLargeScreen(window.innerWidth >= 1024); // Line 105
  };

  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
  return () => window.removeEventListener("resize", checkScreenSize);
}, []); // Empty deps - runs on EVERY mount
```

**Issue:** Same as MainLayout - re-runs on every mount

---

### File 3: Header.tsx

**Path**: [src/components/layout/Header.tsx](src/components/layout/Header.tsx)

#### Problem 8: Header Position Animation (Lines 43-50)

```typescript
<motion.header
  initial={false}
  animate={false}
  className="fixed top-0 h-16 lg:h-20 bg-card/80 backdrop-blur-xl border-b border-border z-40 flex items-center justify-between px-4 sm:px-6"
  style={{
    left: isLargeScreen ? (isRTL ? 0 : sidebarWidth) : 0,      // Line 47
    right: isLargeScreen ? (isRTL ? sidebarWidth : 0) : 0,    // Line 48
    transition: "left 0.3s ease-in-out, right 0.3s ease-in-out",  // ⚠️ LINE 49
  }}
>
```

**Why it's a problem:**

- Header position (left/right) depends on `sidebarWidth`
- When `sidebarWidth` recalculates, Header position animates
- CSS transition is set to 0.3s

**Impact:** Header shifts left/right on route navigation

---

#### Problem 9: isLargeScreen State (Lines 24-34)

```typescript
useEffect(() => {
  const checkScreenSize = () => {
    setIsLargeScreen(window.innerWidth >= 1024); // Line 26
  };

  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
  return () => window.removeEventListener("resize", checkScreenSize);
}, []);
```

**Issue:** Same problem - multiple listeners created across routes

---

## The Chain Reaction

```
User navigates to /inventory
    ↓
RouteChange: /dashboard → /inventory
    ↓
MainLayout component UNMOUNTS (old instance destroyed)
    ↓
MainLayout component MOUNTS (new instance created)
    ↓
useEffect runs → setIsLargeScreen(true) ← NEW STATE
    ↓
sidebarCollapsed = false (fresh state)
    ↓
sidebarWidth = 280
    ↓
sidebarAnimation object recalculates (new reference)
    ↓
Framer Motion detects animate prop change
    ↓
Animation triggers: initial-to-animate
    ↓
Sidebar animates 0.3s
    ↓
Header left/right animates 0.3s
    ↓
Main margin animates 0.3s
    ↓
User sees: SIDEBAR SLIDING IN ❌
```

---

## State Flow Diagram

### Current (Broken):

```
/dashboard
  └─ MainLayout Instance 1
       ├─ sidebarCollapsed: false
       └─ isLargeScreen: true

↓ Navigate

/inventory
  └─ MainLayout Instance 2 ← NEW INSTANCE
       ├─ sidebarCollapsed: false ← FRESH STATE
       └─ isLargeScreen: true ← FRESH STATE

↓

Animation triggers because states/effects are recalculated
```

### Correct (Fixed):

```
Root
  └─ UIContext Provider (stores sidebarCollapsed globally)
       └─ MainLayout Instance (SINGLE, never unmounts)
            ├─ Sidebar (reads from context)
            ├─ Header (reads from context)
            └─ {children}
                 ├─ /dashboard page
                 ├─ /inventory page
                 ├─ /sales page
                 └─ ... (all pages)

↓ Navigate

Only {children} changes, MainLayout stays stable
No state reset, no animation trigger ✓
```

---

## Summary Table

| Line    | File       | Problem                         | Type        | Fix                             |
| ------- | ---------- | ------------------------------- | ----------- | ------------------------------- |
| 18-20   | MainLayout | State reset on mount            | 🔴 Critical | Move to Context                 |
| 25-35   | MainLayout | useEffect runs on every mount   | 🟡 Medium   | Use Context                     |
| 54-56   | MainLayout | Margin animation trigger        | 🔴 Critical | Remove animation on route       |
| 115-122 | Sidebar    | Animation memo recalculates     | 🔴 Critical | Use stable state from Context   |
| 132-141 | Sidebar    | Framer Motion animation trigger | 🔴 Critical | Remove animation or use Context |
| 102-110 | Sidebar    | useEffect runs on every mount   | 🟡 Medium   | Use Context                     |
| 43-50   | Header     | Position animation trigger      | 🔴 Critical | Remove animation on route       |
| 47-49   | Header     | Header left/right animation     | 🔴 Critical | Disable or use state context    |

---

## Key Insight

**The root cause is not in the components themselves—it's in the architecture.**

The sidebar state is stored in a component that gets recreated on every route change. Moving that state to a higher level (Context or Root Layout) that doesn't remount during navigation will fix all these symptoms.

**All 8 animation problems will disappear once the state persists across route changes.**
