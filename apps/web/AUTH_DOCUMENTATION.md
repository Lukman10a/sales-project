# Authentication System Documentation

## Overview

LUXA Sales now has a complete authentication system with role-based access control. Users must log in to access the application, and authentication persists across sessions using localStorage.

## Features Implemented

### ✅ Login System

- **Login Page**: Beautiful centered card design with gradient background
- **Role Toggle**: Animated toggle to select Super Admin or Admin role
- **Form Validation**: Email and password validation
- **Remember Me**: Option to persist login longer (UI only, to be connected)
- **Forgot Password**: Link placeholder for password recovery
- **Demo Credentials**: Displayed on login page for testing

### ✅ User Roles

Two distinct roles with different permissions:

**Super Admin (Owner)**

- Email: ahmed@luxa.com
- Password: admin123
- Full access to all features
- Can invite staff members (Admin users)
- Manages business settings

**Admin (Apprentice/Staff)**

- Email: ibrahim@luxa.com
- Password: staff123
- Limited access (to be configured per feature)
- Cannot invite other users
- Can perform day-to-day operations

### ✅ Protected Routes

- All main pages are protected and require authentication
- Unauthenticated users are redirected to login page
- Login page redirects to dashboard if already authenticated
- Role-based protection available for specific pages

### ✅ Authentication Context

- React Context API for global auth state
- Hooks: `useAuth()` provides user, login, logout, isAuthenticated, isLoading
- Automatic session check on app load
- Seamless authentication across all components

### ✅ Persistent Sessions

- Auth state stored in localStorage
- Survives page refreshes and browser restarts
- Last selected role remembered for convenience
- Secure logout clears session data

### ✅ Beautiful UI

- Glassmorphism card with backdrop blur
- Gradient background with decorative elements
- Animated role toggle with spring physics
- Loading states with spinners
- Error alerts with animations
- Responsive design for all screen sizes

### ✅ User Profile in Sidebar

- User avatar with initials
- Display name from auth context
- Role badge (Super Admin / Admin)
- Functional logout button
- Collapsed view shows avatar only

## File Structure

```
src/
├── lib/
│   └── auth.ts                    # Auth service with mock data
├── contexts/
│   └── AuthContext.tsx            # Global auth state management
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx          # Login form component
│   │   ├── RoleToggle.tsx         # Animated role selector
│   │   └── ProtectedRoute.tsx     # Route protection wrapper
│   └── layout/
│       ├── MainLayout.tsx         # Updated to use auth
│       └── Sidebar.tsx            # Updated with real auth
└── app/
    ├── auth/
    │   ├── layout.tsx             # Auth page layout
    │   └── login/
    │       └── page.tsx           # Login page
    ├── providers.tsx              # Added AuthProvider
    └── middleware.ts              # Route protection (placeholder)
```

## Mock Users Database

Located in `src/lib/auth.ts`:

```typescript
const MOCK_USERS = {
  "ahmed@luxa.com": {
    password: "admin123",
    user: {
      id: "1",
      email: "ahmed@luxa.com",
      firstName: "Ahmed",
      lastName: "Hassan",
      role: "owner",
      businessName: "Hassan Electronics",
      avatar: "...",
    },
  },
  "ibrahim@luxa.com": {
    password: "staff123",
    user: {
      id: "2",
      email: "ibrahim@luxa.com",
      firstName: "Ibrahim",
      lastName: "Musa",
      role: "apprentice",
      businessName: "Hassan Electronics",
      avatar: "...",
    },
  },
};
```

## Usage Examples

### Using Auth in Components

```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div>
      <p>Welcome, {user?.firstName}!</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protecting a Page

```typescript
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function AdminOnlyPage() {
  return (
    <ProtectedRoute requireRole="owner">
      <h1>Super Admin Only Content</h1>
    </ProtectedRoute>
  );
}
```

### Manual Auth Checks

```typescript
import { AuthService } from "@/lib/auth";

// Check if authenticated
if (AuthService.isAuthenticated()) {
  // User is logged in
}

// Get current user
const user = AuthService.getUser();

// Check specific role
if (AuthService.hasRole("owner")) {
  // User is Super Admin
}
```

## Authentication Flow

1. **User visits app** → Redirected to `/auth/login` if not authenticated
2. **User enters credentials** → Selects role (Super Admin or Admin)
3. **Form submission** → AuthService validates credentials
4. **Successful login** → User stored in localStorage + AuthContext
5. **Redirect to dashboard** → User can access protected routes
6. **Session persistence** → Auth checked on page refresh
7. **User clicks logout** → localStorage cleared, redirected to login

## API Endpoints (Future)

When connecting to a real backend, replace mock data with these endpoints:

```typescript
POST / api / auth / login;
Body: {
  email, password, role;
}
Response: {
  user, token;
}

POST / api / auth / logout;
Headers: {
  Authorization: Bearer<token>;
}

GET / api / auth / me;
Headers: {
  Authorization: Bearer<token>;
}
Response: {
  user;
}

POST / api / auth / refresh;
Body: {
  refreshToken;
}
Response: {
  token, refreshToken;
}
```

## Security Notes

⚠️ **Current Implementation**: Mock authentication for development

- Passwords are checked client-side (insecure)
- localStorage is used (vulnerable to XSS)
- No server-side validation

🔒 **Production Requirements**:

1. Replace mock auth with real API calls
2. Use HTTP-only cookies for tokens
3. Implement JWT with refresh tokens
4. Add rate limiting on login endpoint
5. Enable 2FA for Super Admin accounts
6. Add password strength requirements
7. Implement password reset flow
8. Add session timeout
9. Log authentication attempts
10. Use HTTPS only

## Next Steps

### Phase 1: Staff Invitation System

- [ ] Create invite staff page (Super Admin only)
- [ ] Generate unique invitation links
- [ ] Staff registration with invite token
- [ ] Email invitation system

### Phase 2: Backend Integration

- [ ] Connect to real API endpoints
- [ ] Implement JWT token management
- [ ] Add token refresh logic
- [ ] Server-side session validation

### Phase 3: Enhanced Security

- [ ] Add 2FA support
- [ ] Implement password reset flow
- [ ] Add activity logging
- [ ] Session management dashboard

### Phase 4: User Management

- [ ] View all staff members (Super Admin)
- [ ] Deactivate/activate users
- [ ] Update user roles
- [ ] User activity audit logs

## Testing

### Test Accounts

**Super Admin**:

- Email: ahmed@luxa.com
- Password: admin123
- Role: Select "Super Admin"

**Admin**:

- Email: ibrahim@luxa.com
- Password: staff123
- Role: Select "Admin"

### Test Scenarios

1. ✅ Login with Super Admin credentials
2. ✅ Login with Admin credentials
3. ✅ Try wrong password (should show error)
4. ✅ Try non-existent email (should show error)
5. ✅ Try wrong role (should show error)
6. ✅ Logout and verify redirect to login
7. ✅ Refresh page while logged in (should stay logged in)
8. ✅ Access protected routes without login (should redirect)
9. ✅ Navigate between pages while logged in
10. ✅ Sidebar shows correct user info

## Common Issues

### Issue: Can't log in

**Solution**: Make sure to select the correct role toggle (Super Admin or Admin)

### Issue: Redirected to login after refresh

**Solution**: Check browser localStorage - auth data should persist

### Issue: Role toggle not working

**Solution**: User accounts are fixed - ahmed@luxa.com is Super Admin only, ibrahim@luxa.com is Admin only

### Issue: Session not persisting

**Solution**: Check browser privacy settings - localStorage must be enabled

## Contributing

When adding new features that require authentication:

1. Import `useAuth()` hook
2. Access `user` object for user data
3. Check `isAuthenticated` before rendering protected content
4. Wrap pages with `<ProtectedRoute>` if needed
5. Use `requireRole` prop for role-specific pages

---

**Status**: ✅ Authentication System Complete
**Version**: 1.0.0
**Last Updated**: January 13, 2026
