# LGU-SSO: Username Auth, Self-Registration & Client Portal

**Date:** 2026-03-25
**Status:** Draft

## Problem

The LGU-SSO system uses email/password authentication, which is not friendly for non-technical LGU employees. There is no self-registration — the super admin must manually create every user account. Employees have no portal to manage their own profiles.

## Goals

1. Replace email/password login with username/password across all login surfaces
2. Add self-registration so employees can create their own accounts
3. Add a client portal where employees can view/edit their profile and see their application access
4. Provide a guided first-login experience that forces a password change

## Non-Goals

- Changing the SSO protocol or token flow between client apps and lgu-sso
- Adding email/SMS notifications
- Building admin approval workflows for registration
- Adding new roles or permission models

---

## Design

### 1. Username Format & Default Password

**Username:** `first_initial.last_name` (lowercased)
- Example: Jayson Alanano → `j.alanano`
- Collision handling: append incrementing number → `j.alanano2`, `j.alanano3`
- Username is auto-generated at registration time (by backend)

**Default password:** `first_initial + full_last_name` (lowercased, no dot)
- Example: Jayson Alanano → `jalanano`
- User must change this on first login

### 2. Self-Registration

**Route:** `/register` (also linked from `/login` and `/sso/login`)

**Form fields (minimal):**
- First Name (required)
- Middle Name (optional)
- Last Name (required)

**On submit:**
1. `POST /auth/register` with `{ first_name, middle_name?, last_name }`
2. Backend auto-generates username (handles collisions) and default password
3. Backend auto-grants `guest` role on all currently registered applications
4. Backend sets `must_change_password = true`
5. Response returns `{ username }` and the default password pattern

**Success screen shows:**
- Generated username (with copy button)
- Default password (with copy button)
- Warning that password change will be required on first login
- "Go to Login" button

### 3. Unified Login Page

**Route:** `/login` (replaces current admin-only login)

**Changes from current:**
- Email field → Username field
- Adds "Don't have an account? Register here" link
- After successful auth, checks `must_change_password`:
  - If `true` → redirect to `/setup-account`
  - If `false` → role-based redirect:
    - User has `super_administrator` role on any app → `/dashboard`
    - Everyone else → `/portal`

### 4. SSO Login Page

**Route:** `/sso/login` (existing, modified)

**Changes from current:**
- Email field → Username field
- Adds "Don't have an account? Register here" link (preserves SSO query params)
- After successful auth, checks `must_change_password`:
  - If `true` → redirect to `/setup-account` (with SSO redirect params preserved in session/query)
  - If `false` → redirect back to client app with token (existing behavior)

### 5. First-Login Password Change Stepper

**Route:** `/setup-account` (new, under `/(setup)` route group)

**Full-screen, 3-step experience:**

1. **Welcome** — greeting with user's name, explains what's about to happen
2. **New Password** — password + confirm fields, real-time validation:
   - At least 8 characters
   - Contains a number
   - Contains a special character
3. **Done** — success animation, "Continue" button

**On password submit:**
- `POST /auth/change-password` with `{ current_password, new_password }`
- Backend clears `must_change_password` flag

**After completion:**
- If came from SSO flow → redirect back to client app with token
- If came from direct login → role-based redirect (dashboard or portal)

### 6. Client Portal

**Route group:** `/(portal)` with its own layout

**Layout:**
- Top navigation bar: LGU Portal logo, username, avatar with initials, logout
- Left sidebar: Profile, Applications, Change Password

**Pages:**

#### 6a. Profile (`/portal`)
- Displays all employee fields in a read-only grid
- Empty/unset fields show "Not set" in muted italic
- "Edit Profile" button switches to edit mode
- Editable fields: email, birthday, civil_status, nationality, residence, address fields (region, province, city, barangay via PSGC dropdowns), position
- Non-editable fields: username, first_name, middle_name, last_name (admin-managed)
- Uses existing PSGC API integration for address dropdowns
- `PUT /portal/profile` to save changes

#### 6b. Applications (`/portal/applications`)
- Read-only list of applications the employee has access to
- Each card shows: app name, description, role badge (Guest, Standard, etc.)
- `GET /portal/applications`

#### 6c. Change Password (`/portal/change-password`)
- Current password + new password + confirm fields
- Same validation rules as first-login stepper
- `POST /auth/change-password`

### 7. Admin Dashboard Changes

**Route group:** `/(dashboard)` — existing

**Changes:**
- Layout guard: verify user has `super_administrator` role on at least one app (already exists, just formalize)
- Employee creation form: remove email/password fields from required, auto-generation happens on backend
- Employee list: show username column

### 8. Auth State Changes (`hooks/use-auth.ts`)

**Modified Zustand store:**
```typescript
interface AuthState {
  user: Employee | null
  token: string | null
  isAuthenticated: boolean
  isSuperAdmin: boolean
  mustChangePassword: boolean  // NEW
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>  // MODIFIED
  register: (data: RegisterData) => Promise<RegisterResponse>    // NEW
  changePassword: (current: string, newPass: string) => Promise<void>  // NEW
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}
```

**Role-based redirect logic (after login):**
```
if (mustChangePassword) → /setup-account
else if (isSuperAdmin) → /dashboard
else → /portal
```

### 9. New API Endpoints

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/auth/register` | POST | `{ first_name, middle_name?, last_name }` | `{ username, default_password, message }` |
| `/auth/change-password` | POST | `{ current_password, new_password }` | `{ message }` |
| `/auth/login` | POST | `{ username, password }` (modified from email) | `{ token, employee }` (employee now includes `username`, `must_change_password`) |
| `/portal/profile` | GET | — | `Employee` |
| `/portal/profile` | PUT | `Partial<UpdateProfileData>` | `Employee` |
| `/portal/applications` | GET | — | `EmployeeApplication[]` |

### 10. Type Changes

```typescript
// types/employee.ts
interface Employee {
  // ... all existing fields remain
  username: string                    // NEW
  must_change_password: boolean       // NEW
}

// types/auth.ts
interface RegisterData {
  first_name: string
  middle_name?: string
  last_name: string
}

interface RegisterResponse {
  username: string
  default_password: string
  message: string
}

interface ChangePasswordData {
  current_password: string
  new_password: string
}

interface LoginCredentials {
  username: string   // MODIFIED: was email
  password: string
}
```

### 11. Mock API Extensions

Extend `lib/mock/` with:
- `mockRegister()` — generates username from name fields, checks for collisions against mock data, adds employee to mock store with `must_change_password: true` and `guest` role on all mock applications
- `mockChangePassword()` — validates current password, sets `must_change_password: false`
- Updated `mockLogin()` — accepts username instead of email
- `mockGetPortalProfile()` — returns current user's employee data
- `mockUpdatePortalProfile()` — updates employee fields
- `mockGetPortalApplications()` — returns current user's application list

### 12. Route Protection Summary

| Route | Access |
|-------|--------|
| `/login` | Public |
| `/register` | Public |
| `/sso/login` | Public (with SSO params) |
| `/setup-account` | Authenticated + `must_change_password === true` |
| `/dashboard/*` | Authenticated + `super_administrator` role |
| `/portal/*` | Authenticated + `must_change_password === false` |

---

## Implementation Approach

**Frontend-First:** Build all UI against mock API endpoints, then implement backend to match.

1. Update types (add `username`, `must_change_password`, new API types)
2. Extend mock API layer with new endpoints
3. Modify login pages (email → username)
4. Build registration page + success screen
5. Build first-login password change stepper
6. Build client portal (layout, profile, applications, change password)
7. Update auth hook with new methods and redirect logic
8. Update route protection/guards
9. Update admin employee list to show username

## Backend Changes Required (Separate Repo)

These are not implemented in this frontend project but document the API contract:

1. Add `username` column to employees table (unique, indexed)
2. Add `must_change_password` boolean column (default: true)
3. Auto-generate username on employee creation (handle collisions)
4. New `POST /auth/register` endpoint
5. New `POST /auth/change-password` endpoint
6. Modify `POST /auth/login` to accept username
7. Auto-grant guest role on all apps during registration
8. New `GET /portal/profile`, `PUT /portal/profile`, `GET /portal/applications` endpoints
