# Username Auth, Self-Registration & Client Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use /frontend-design skill for all UI page implementations.

**Goal:** Replace email/password auth with username/password, add self-registration, a first-login password change stepper, and a client portal for employees.

**Architecture:** Frontend-first approach — all UI built against mock API endpoints. Types and mock layer updated first, then UI pages built on top. Auth hook modified to support all user roles (not just super admin). New `/(portal)` and `/(setup)` route groups added alongside existing `/(dashboard)`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui (New York), Zustand 5, react-hook-form, zod, sonner

**Spec:** `docs/superpowers/specs/2026-03-25-username-auth-registration-portal-design.md`

**Status:** All 15 tasks completed (frontend-first, mock API). Remaining for full backend integration:
- Portal profile page: replace plain text address inputs with PSGC cascading dropdowns (Task 11, Step 2)
- Backend: implement all new API endpoints (register, change-password, portal profile/applications)
- Switch `NEXT_PUBLIC_USE_MOCK_API` back to `false` once backend is ready

---

## File Structure

### New Files

```
types/portal.ts                              — Portal-specific types (UpdatePortalProfileData)
lib/api/portal.ts                            — Portal API client (profile, applications)
lib/api/sso.ts                               — SSO API client (validate-redirect, session-check)
app/(auth)/register/page.tsx                 — Self-registration page
app/(setup)/layout.tsx                       — Setup route group layout (auth guard for must_change_password)
app/(setup)/setup-account/page.tsx           — First-login password change stepper
app/(portal)/layout.tsx                      — Portal layout (top nav + sidebar)
app/(portal)/portal/page.tsx                 — Profile page
app/(portal)/portal/applications/page.tsx    — Read-only applications list
app/(portal)/portal/change-password/page.tsx — Manual password change
components/portal/portal-sidebar.tsx         — Portal sidebar navigation
components/portal/portal-header.tsx          — Portal top navigation bar
```

### Modified Files

```
types/employee.ts        — Add username, must_change_password to Employee interface
types/auth.ts            — Add RegisterData, RegisterResponse, ChangePasswordData, update LoginCredentials
lib/mock/data.ts         — Add username/must_change_password to mock employees, add mock new user
lib/mock/api.ts          — Add mockRegister, mockChangePassword, mockPortalApi, mockSsoApi; update mockLogin
lib/api/auth.ts          — Add register(), changePassword(); update login() signature
lib/api/index.ts         — Export new API modules (portalApi, ssoApi)
hooks/use-auth.ts        — Remove super-admin gate, add mustChangePassword, register(), changePassword()
app/(auth)/login/page.tsx       — Email→username, register link, role-based redirect
app/(auth)/sso/login/page.tsx   — Email→username, refactor to shared API layer, register link
app/(dashboard)/layout.tsx      — Add super_administrator role guard
app/(dashboard)/employees/page.tsx     — Add username column to table
app/(dashboard)/employees/new/page.tsx — Remove required email/password, auto-generation note
```

---

## Task 1: Update Types

**Files:**
- Modify: `types/employee.ts`
- Modify: `types/auth.ts`
- Create: `types/portal.ts`

- [x] **Step 1: Add username and must_change_password to Employee interface**

In `types/employee.ts`, add two new fields to the `Employee` interface after the `email` field:

```typescript
// Add after email: string
username: string
must_change_password: boolean
```

- [x] **Step 2: Update CreateEmployeeData — make email and password optional**

In `types/employee.ts`, update `CreateEmployeeData` interface:
- Change `email: string` to `email?: string`
- Change `password: string` to `password?: string`

- [x] **Step 3: Update auth types**

In `types/auth.ts`, make the following changes:

1. Update `LoginCredentials`:
```typescript
export interface LoginCredentials {
  username: string  // was: email
  password: string
}
```

2. Add new interfaces after `LoginCredentials`:
```typescript
export interface RegisterData {
  first_name: string
  middle_name?: string
  last_name: string
}

export interface RegisterResponse {
  username: string
  message: string
}

export interface ChangePasswordData {
  current_password: string
  new_password: string
}
```

- [x] **Step 4: Create portal types**

Create `types/portal.ts`:

```typescript
export interface UpdatePortalProfileData {
  email?: string
  birthday?: string
  civil_status?: "single" | "married" | "widowed" | "separated" | "divorced"
  nationality?: string
  residence?: string
  block_number?: string
  building_floor?: string
  house_number?: string
  region?: string
  province?: string
  city?: string
  barangay?: string
  position?: string
}
```

- [x] **Step 5: Commit**

```bash
git add types/employee.ts types/auth.ts types/portal.ts
git commit -m "feat: update types for username auth, registration, and portal"
```

---

## Task 2: Extend Mock Data

**Files:**
- Modify: `lib/mock/data.ts`

- [x] **Step 1: Update MOCK_CREDENTIALS to use username**

In `lib/mock/data.ts`, change `MOCK_CREDENTIALS`:

```typescript
export const MOCK_CREDENTIALS = {
  username: "m.delacruz",  // was: email: "maria.delacruz@lgu.gov.ph"
  password: "admin123",
}
```

- [x] **Step 2: Add username and must_change_password to mockCurrentUser**

Add `username: "m.delacruz"` and `must_change_password: false` to the `mockCurrentUser` object.

- [x] **Step 3: Add username and must_change_password to all mockEmployees**

For each employee in the `mockEmployees` array, add a `username` field following the `first_initial.last_name` pattern and `must_change_password: false`. For example:
- Maria Reyes Dela Cruz → `username: "m.delacruz"`
- Juan Santos → `username: "j.santos"`
- Ana Bautista Gonzales → `username: "a.gonzales"`
- (continue for all existing mock employees)

- [x] **Step 4: Add a mock "new user" employee for testing first-login flow**

Add a new employee to `mockEmployees` with `must_change_password: true` and `username: "t.tester"` for testing the first-login stepper. Set password in a way the mock login can validate (e.g., default password "ttester").

- [x] **Step 5: Commit**

```bash
git add lib/mock/data.ts
git commit -m "feat: add username and must_change_password to mock data"
```

---

## Task 3: Extend Mock API

**Files:**
- Modify: `lib/mock/api.ts`

- [x] **Step 1: Update mockAuthApi.login to accept username instead of email**

Change the `login` method in `mockAuthApi`. **Note:** This is a calling convention change — the current signature uses positional params `(email: string, password: string)`. Change to an object param `({ username, password }: { username: string; password: string })` to match the updated real API and auth hook:
- Accept `{ username, password }` instead of `{ email, password }`
- Find the user by `username` in `mockEmployees` instead of by `email`
- Include `username` and `must_change_password` in the response employee object
- Remove the super-admin-only check if present in mock

- [x] **Step 2: Add mockAuthApi.register method**

Add a `register` method to `mockAuthApi`:
- Accepts `{ first_name, middle_name?, last_name }`
- Generates username: `first_initial.last_name` lowercased
- Checks for collision in `mockEmployees`, appends number if needed
- Creates new employee object with all required fields (defaults for optional ones)
- Sets `must_change_password: true`, `is_active: true`
- Grants `guest` role on all `mockApplications`
- Pushes to `mockEmployees` array
- Returns `{ data: { username, message: "Registration successful" } }`

- [x] **Step 3: Add mockAuthApi.changePassword method**

Add a `changePassword` method to `mockAuthApi`:
- Accepts `{ current_password, new_password }`
- Validates current_password matches (mock validation)
- Sets `must_change_password: false` on the current user in mock data
- Returns `{ message: "Password changed successfully" }`

- [x] **Step 4: Add mockSsoApi**

Add a new `mockSsoApi` object with methods:
- `validateRedirect({ client_id, redirect_uri })` — validates against mockApplications, returns `{ valid: true, application: { name, description } }`
- `sessionCheck()` — returns `{ authenticated: false }` (always for mock)

- [x] **Step 5: Add mockPortalApi**

Add a new `mockPortalApi` object with methods:
- `getProfile()` — returns `{ data: mockCurrentUser }` (the currently "logged in" mock user)
- `updateProfile(data: UpdatePortalProfileData)` — merges data into mockCurrentUser, returns updated `{ data: mockCurrentUser }`
- `getApplications()` — returns `{ data: mockCurrentUser.applications }`

- [x] **Step 6: Commit**

```bash
git add lib/mock/api.ts
git commit -m "feat: extend mock API with register, change-password, portal, and SSO endpoints"
```

---

## Task 4: Create Real API Clients

**Files:**
- Modify: `lib/api/auth.ts`
- Create: `lib/api/portal.ts`
- Create: `lib/api/sso.ts`
- Modify: `lib/api/index.ts`

- [x] **Step 1: Update authApi in lib/api/auth.ts**

1. Update `login` method signature: accept `{ username, password }` instead of `{ email, password }`
2. Add `register` method:
```typescript
register: async (data: RegisterData): Promise<RegisterResponse> => {
  const response = await apiClient.post<{ data: RegisterResponse }>("/auth/register", data)
  return response.data
},
```
3. Add `changePassword` method:
```typescript
changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
  return apiClient.post<{ message: string }>("/auth/change-password", data)
},
```

- [x] **Step 2: Create lib/api/portal.ts**

```typescript
import { apiClient } from "./client"
import type { Employee } from "@/types/employee"
import type { EmployeeApplication } from "@/types/employee"
import type { UpdatePortalProfileData } from "@/types/portal"

export const portalApi = {
  getProfile: async (): Promise<Employee> => {
    const response = await apiClient.get<{ data: Employee }>("/portal/profile")
    return response.data
  },

  updateProfile: async (data: UpdatePortalProfileData): Promise<Employee> => {
    const response = await apiClient.put<{ data: Employee }>("/portal/profile", data)
    return response.data
  },

  getApplications: async (): Promise<EmployeeApplication[]> => {
    const response = await apiClient.get<{ data: EmployeeApplication[] }>("/portal/applications")
    return response.data
  },
}
```

- [x] **Step 3: Create lib/api/sso.ts**

```typescript
import { apiClient } from "./client"

export const ssoApi = {
  validateRedirect: async (data: { client_id: string; redirect_uri: string }): Promise<{ valid: boolean; application: { name: string; description: string } }> => {
    return apiClient.post("/sso/validate-redirect", data)
  },

  sessionCheck: async (): Promise<{ authenticated: boolean; token?: string }> => {
    return apiClient.get("/sso/session-check")
  },
}
```

- [x] **Step 4: Update lib/api/index.ts to export new modules**

Add imports and exports for `portalApi`, `ssoApi`, and the new auth methods. Follow the existing pattern of switching between mock and real API based on `NEXT_PUBLIC_USE_MOCK_API`:

```typescript
import { mockPortalApi, mockSsoApi } from "../mock/api"
import { portalApi as realPortalApi } from "./portal"
import { ssoApi as realSsoApi } from "./sso"

export const portalApi = useMockApi ? mockPortalApi : realPortalApi
export const ssoApi = useMockApi ? mockSsoApi : realSsoApi
```

- [x] **Step 5: Commit**

```bash
git add lib/api/auth.ts lib/api/portal.ts lib/api/sso.ts lib/api/index.ts
git commit -m "feat: add portal, SSO, and updated auth API clients"
```

---

## Task 5: Update Auth Hook

**Files:**
- Modify: `hooks/use-auth.ts`

- [x] **Step 1: Add mustChangePassword state and new methods to the store**

In the Zustand store definition, add:
- `mustChangePassword: boolean` to state (default `false`)
- `register: (data: RegisterData) => Promise<RegisterResponse>` method
- `changePassword: (currentPassword: string, newPassword: string) => Promise<void>` method
- Update `login` signature to accept `(username: string, password: string)`

- [x] **Step 2: Rewrite login() — remove super-admin gate, add role-based logic**

The current `login()` method:
1. Calls `api.auth.login({ email, password })`
2. Sets token and calls `api.auth.me()`
3. **Throws** if user is not super_administrator → THIS MUST BE REMOVED

Replace with:
1. Call `api.auth.login({ username, password })`
2. Set token and call `api.auth.me()`
3. Determine `isSuperAdmin` (has `super_administrator` role on any app)
4. Set `mustChangePassword` from `user.must_change_password`
5. Set all state: `user`, `token`, `isAuthenticated`, `isSuperAdmin`, `mustChangePassword`
6. Do NOT throw for non-super-admins — all roles can log in

- [x] **Step 3: Rewrite checkAuth() — remove super-admin gate, handle mustChangePassword**

The current `checkAuth()`:
1. Calls `api.auth.me()`
2. **Calls logout()** if user is not super_administrator → THIS MUST BE REMOVED

Replace with:
1. Call `api.auth.me()`
2. Set `isSuperAdmin` from role check
3. Set `mustChangePassword` from `user.must_change_password`
4. Set all state without any role-based rejection

- [x] **Step 4: Add register() method**

```typescript
register: async (data: RegisterData): Promise<RegisterResponse> => {
  return api.auth.register(data)
},
```

- [x] **Step 5: Add changePassword() method**

```typescript
changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.auth.changePassword({ current_password: currentPassword, new_password: newPassword })
  set({ mustChangePassword: false })
},
```

- [x] **Step 6: Update logout() to reset mustChangePassword**

Add `mustChangePassword: false` to the state reset in `logout()`.

- [x] **Step 7: Commit**

```bash
git add hooks/use-auth.ts
git commit -m "feat: update auth hook — remove super-admin gate, add register and changePassword"
```

---

## Task 6: Update Login Page (email → username)

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Match the existing dark theme, shadcn/ui components, Plus Jakarta Sans font, and split-panel layout.

- [x] **Step 1: Change form state from email to username**

Replace `email` state variable with `username`. Update the form field:
- Label: "Username" (was "Email Address")
- Input type: "text" (was "email")
- Placeholder: "e.g., j.alanano" (was email placeholder)
- Remove any email validation

- [x] **Step 2: Update login call to use username**

Change `login(email, password)` to `login(username, password)`.

- [x] **Step 3: Add role-based redirect after login**

After successful login, instead of always redirecting to `/dashboard`:

```typescript
const { mustChangePassword, isSuperAdmin } = useAuth.getState()
if (mustChangePassword) {
  router.push("/setup-account")
} else if (isSuperAdmin) {
  router.push("/dashboard")
} else {
  router.push("/portal")
}
```

- [x] **Step 4: Add "Register here" link**

Below the login button, add a link:
```
Don't have an account? <Link href="/register">Register here</Link>
```

- [x] **Step 5: Remove super-admin-only messaging**

Remove any text/error messages about "Super administrator role required" since all roles can now log in.

- [x] **Step 6: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: update login page — username field, role-based redirect, register link"
```

---

## Task 7: Update SSO Login Page

**Files:**
- Modify: `app/(auth)/sso/login/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Match existing SSO login page styling.

- [x] **Step 1: Refactor direct fetch() calls to use shared API layer**

Replace all direct `fetch()` calls in this file:
- `fetch(\`${API_BASE_URL}/sso/validate-redirect\`, ...)` → `ssoApi.validateRedirect({ client_id, redirect_uri })`
- `fetch(\`${API_BASE_URL}/sso/session-check\`, ...)` → `ssoApi.sessionCheck()`
- `fetch(\`${API_BASE_URL}/auth/login\`, ...)` → `api.auth.login({ username, password })`

Import `ssoApi` and `api` from `@/lib/api`.

- [x] **Step 2: Change form field from email to username**

- Label: "Username" (was "Email Address")
- Input type: "text" (was "email")
- Placeholder: "e.g., j.alanano"
- Update form state variable from `email` to `username`

- [x] **Step 3: Add must_change_password check after login**

After successful SSO login, before redirecting back to the client app:
- Check `must_change_password` from the login response
- If `true` → redirect to `/setup-account?redirect_uri={redirect_uri}&state={state}` (preserve SSO params)
- If `false` → redirect to client app with token (existing behavior)

- [x] **Step 4: Add "Register here" link**

Add below the login form, preserving SSO query params in the register link:
```
Don't have an account? <Link href={`/register?redirect_sso=true&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`}>Register here</Link>
```

- [x] **Step 5: Commit**

```bash
git add app/(auth)/sso/login/page.tsx
git commit -m "feat: update SSO login — username field, shared API layer, register link"
```

---

## Task 8: Build Registration Page

**Files:**
- Create: `app/(auth)/register/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Match the login page's split-panel dark theme layout. Simple, clean, 3-field form.

- [x] **Step 1: Build the registration form component**

Create `app/(auth)/register/page.tsx` as a client component with:
- Same split-panel layout as login page (left branding, right form)
- LGU branding/logo on left panel
- Form with 3 fields:
  - First Name (required) — `<Input>` with label
  - Middle Name (optional) — `<Input>` with label showing "(optional)"
  - Last Name (required) — `<Input>` with label
- "Register" `<Button>` with loading state
- "Already have an account? Sign in" link → `/login`
- Form state: `firstName`, `middleName`, `lastName`, `isLoading`, `error`

- [x] **Step 2: Add form validation**

Client-side validation before submit:
- First name: required, non-empty after trim
- Last name: required, non-empty after trim
- Middle name: optional
- Show inline error messages using the existing destructive styling pattern

- [x] **Step 3: Add submit handler with success state**

On submit:
1. Call `useAuth().register({ first_name, middle_name, last_name })`
2. On success, switch to success view (same page, different state)
3. On error, show error message with toast

- [x] **Step 4: Build the success screen**

After successful registration, show (replacing the form):
- Green checkmark icon
- "Account Created!" heading
- Generated username displayed in a monospace card with copy-to-clipboard button
- Password hint: "Your default password is your first initial + full last name (e.g., jalanano)"
- Warning badge: "You'll be asked to change your password on first login."
- "Go to Login" button → `/login`

- [x] **Step 5: Handle SSO redirect params**

If URL has `redirect_sso=true&client_id=...&redirect_uri=...&state=...` query params (came from SSO login):
- "Go to Login" button should redirect to `/sso/login?client_id=...&redirect_uri=...&state=...` instead of `/login`
- "Already have an account? Sign in" link should also preserve SSO params

- [x] **Step 6: Commit**

```bash
git add app/(auth)/register/page.tsx
git commit -m "feat: add self-registration page with success screen"
```

---

## Task 9: Build First-Login Password Change Stepper

**Files:**
- Create: `app/(setup)/layout.tsx`
- Create: `app/(setup)/setup-account/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Full-screen dark theme, centered content, step indicator with animations.

- [x] **Step 1: Create the setup route group layout**

Create `app/(setup)/layout.tsx`:
- Client component with auth guard
- Check `isAuthenticated` — if not, redirect to `/login`
- Check `mustChangePassword` — if `false`, redirect based on role (dashboard or portal)
- Full-screen layout with no sidebar/header (clean setup experience)
- Loading state while checking auth

- [x] **Step 2: Build the stepper page — Step 1 (Welcome)**

Create `app/(setup)/setup-account/page.tsx` as a client component:
- State: `currentStep` (1, 2, 3)
- Step indicator at top: 3 circles connected by lines, showing current progress
  - Step 1: "Welcome" (active)
  - Step 2: "New Password"
  - Step 3: "Done"
- Welcome content:
  - Greeting: "Welcome, {user.first_name}!"
  - Explanation: "Before you get started, let's secure your account by setting a new password."
  - "Continue" button → moves to step 2

- [x] **Step 3: Build the stepper — Step 2 (New Password)**

Step 2 content:
- "Set Your New Password" heading
- "Choose a secure password you'll remember" subtitle
- New Password field with show/hide toggle
- Confirm Password field with show/hide toggle
- Real-time validation checklist:
  - At least 8 characters (check/uncheck icon)
  - Contains a number (check/uncheck icon)
  - Contains a special character (check/uncheck icon)
  - Passwords match (check/uncheck icon, shown when confirm has input)
- "Set Password" button — disabled until all validations pass
- Loading state during API call

- [x] **Step 4: Add password submit handler**

On "Set Password" click:
1. Call `useAuth().changePassword(currentPassword, newPassword)` — `currentPassword` is sourced from the password the user just logged in with. Store it in session state (e.g., from the login page via a query param or zustand transient state). If not available, use a hidden field or prompt for it.
2. On success → move to step 3
3. On error → show error toast, stay on step 2

**Implementation note for current_password:** The simplest approach is to add a transient (non-persisted) `sessionPassword` field to the auth store that gets set during login and cleared after password change. This avoids query params or other leaky mechanisms. **Important:** The current Zustand `persist` middleware's `partialize` only persists `token` and `user`, so `sessionPassword` will be excluded by default — but do NOT add it to `partialize`. It must never be written to localStorage.

- [x] **Step 5: Build the stepper — Step 3 (Done)**

Step 3 content:
- Animated green checkmark (CSS animation)
- "You're all set!" heading
- "Your password has been updated successfully." subtitle
- "Continue" button

On "Continue" click:
- Check URL for SSO redirect params (`redirect_uri`, `state`)
- If SSO params present → redirect to client app with token
- Otherwise → role-based redirect: `isSuperAdmin ? "/dashboard" : "/portal"`

- [x] **Step 6: Add step transition animations**

Add smooth CSS transitions between steps:
- Fade out current step, fade in next step
- Use `transition` and conditional class names or Tailwind's `animate-` utilities
- Step indicator updates with color transitions

- [x] **Step 7: Commit**

```bash
git add app/(setup)/layout.tsx app/(setup)/setup-account/page.tsx
git commit -m "feat: add first-login password change stepper"
```

---

## Task 10: Build Portal Layout

**Files:**
- Create: `app/(portal)/layout.tsx`
- Create: `components/portal/portal-header.tsx`
- Create: `components/portal/portal-sidebar.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Match the admin dashboard's dark theme but with a simpler layout. Top nav bar + left sidebar.

- [x] **Step 1: Create the portal header component**

Create `components/portal/portal-header.tsx`:
- Top navigation bar matching the wireframe:
  - Left: LGU Portal logo (blue square with "L") + "LGU Portal" text
  - Right: Username text + avatar circle with user initials + dropdown menu with "Logout"
- Use existing shadcn `DropdownMenu` for user menu
- Style: dark background (`bg-sidebar`), border bottom, consistent with admin header

- [x] **Step 2: Create the portal sidebar component**

Create `components/portal/portal-sidebar.tsx`:
- Left sidebar with navigation links:
  - Profile (`/portal`) — icon: User
  - Applications (`/portal/applications`) — icon: LayoutGrid
  - Change Password (`/portal/change-password`) — icon: Lock
- Active state: blue background highlight on current route
- Use `usePathname()` from next/navigation for active detection
- Style: same sidebar patterns as admin dashboard but simpler (no collapsible sections)

- [x] **Step 3: Create the portal layout**

Create `app/(portal)/layout.tsx`:
- Client component with auth guard:
  - If not authenticated → redirect to `/login`
  - If `mustChangePassword === true` → redirect to `/setup-account`
  - If `isSuperAdmin` → still allow access (admins can view portal too, but they normally go to dashboard)
- Layout structure:
  - Full-width `PortalHeader` at top
  - Below: flex row with `PortalSidebar` (fixed width) + main content area (scrollable)
- Loading state with spinner while checking auth

- [x] **Step 4: Commit**

```bash
git add app/(portal)/layout.tsx components/portal/portal-header.tsx components/portal/portal-sidebar.tsx
git commit -m "feat: add portal layout with header and sidebar"
```

---

## Task 11: Build Portal Profile Page

**Files:**
- Create: `app/(portal)/portal/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Profile display with edit mode toggle. Follow the wireframe layout.

- [x] **Step 1: Build the profile display view**

Create `app/(portal)/portal/page.tsx` as a client component:
- Heading: "My Profile"
- Subtitle: "View and update your personal information"
- Card with grid layout (2 columns) showing all employee fields:
  - First Name, Last Name, Middle Name, Username (monospace)
  - Email, Birthday, Civil Status, Nationality
  - Position, Office
  - Address: Region, Province, City, Barangay, Residence
- Empty fields show "Not set" in muted italic text
- "Edit Profile" button at bottom of card
- Load profile data with `portalApi.getProfile()` on mount
- Loading state with skeleton loader

- [x] **Step 2: Build the profile edit mode**

When "Edit Profile" is clicked:
- Switch to edit mode (state toggle: `isEditing`)
- Non-editable fields (username, first_name, middle_name, last_name) stay as read-only text
- Editable fields become form inputs:
  - Email: `<Input type="email">`
  - Birthday: `<Input type="date">`
  - Civil Status: `<Select>` with options (single, married, widowed, separated, divorced)
  - Nationality: `<Input>`
  - Position: `<Input>`
  - Residence: `<Textarea>`
  - Address fields: Cascading PSGC dropdowns (Region → Province → City/Municipality → Barangay)
    - Reuse the exact PSGC combobox pattern from `app/(dashboard)/employees/new/page.tsx`
    - Uses `psgcApi` from `lib/api/psgc.ts`: `getRegions()`, `getProvinces(regionCode)`, `getMunicipalities(provinceCode)`, `getBarangays(municipalityCode)`
    - Each dropdown uses Popover + Command (shadcn) for searchable select
    - Cascade: Region selection loads Provinces, Province loads Cities/Municipalities, City loads Barangays
    - Track selected codes: `selectedRegionCode`, `selectedProvinceCode`, `selectedCityCode`
    - Store names in form data (not codes): `region`, `province`, `city`, `barangay`
    - Disable child dropdowns until parent is selected
    - Load regions on edit mode mount via `psgcApi.getRegions()`
    - When changing a parent, clear all child selections and lists
    - **Note:** Currently uses plain text inputs as placeholder. This step replaces them with the PSGC cascading dropdowns during the full backend integration build.
- "Save" and "Cancel" buttons replace "Edit Profile"

- [x] **Step 3: Add save handler**

On "Save":
1. Collect only changed fields into `UpdatePortalProfileData`
2. Call `portalApi.updateProfile(data)`
3. On success: show toast "Profile updated", switch back to display mode, update local state
4. On error: show error toast, stay in edit mode

- [x] **Step 4: Commit**

```bash
git add app/(portal)/portal/page.tsx
git commit -m "feat: add portal profile page with view and edit modes"
```

---

## Task 12: Build Portal Applications Page

**Files:**
- Create: `app/(portal)/portal/applications/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Read-only card list matching the wireframe.

- [x] **Step 1: Build the applications list page**

Create `app/(portal)/portal/applications/page.tsx` as a client component:
- Heading: "My Applications"
- Subtitle: "Applications you have access to"
- Load applications with `portalApi.getApplications()` on mount
- Map each application to a card:
  - Left side: App name (bold) + description (muted)
  - Right side: Role badge with color coding:
    - Guest: blue badge
    - Standard: green badge
    - Administrator: amber badge
    - Super Administrator: purple badge
- Use shadcn `Badge` component with variant styling
- Loading state with skeleton cards
- Empty state: "You don't have access to any applications yet."

- [x] **Step 2: Commit**

```bash
git add app/(portal)/portal/applications/page.tsx
git commit -m "feat: add portal applications page"
```

---

## Task 13: Build Portal Change Password Page

**Files:**
- Create: `app/(portal)/portal/change-password/page.tsx`

**UI Skill:** Use @/frontend-design for this implementation. Simple form matching the stepper's password validation UX.

- [x] **Step 1: Build the change password form**

Create `app/(portal)/portal/change-password/page.tsx` as a client component:
- Heading: "Change Password"
- Subtitle: "Update your account password"
- Card with form:
  - Current Password field (with show/hide toggle)
  - New Password field (with show/hide toggle)
  - Confirm New Password field (with show/hide toggle)
- Real-time validation checklist (same as stepper):
  - At least 8 characters
  - Contains a number
  - Contains a special character
  - Passwords match
- "Update Password" button — disabled until all validations pass
- Loading state during API call

- [x] **Step 2: Add submit handler**

On submit:
1. Call `useAuth().changePassword(currentPassword, newPassword)`
2. On success: show toast "Password updated successfully", clear form
3. On error: show error toast (e.g., "Current password is incorrect")

- [x] **Step 3: Commit**

```bash
git add app/(portal)/portal/change-password/page.tsx
git commit -m "feat: add portal change password page"
```

---

## Task 14: Update Admin Dashboard

**Files:**
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `app/(dashboard)/employees/page.tsx`
- Modify: `app/(dashboard)/employees/new/page.tsx`

- [x] **Step 1: Formalize super-admin guard in dashboard layout**

In `app/(dashboard)/layout.tsx`, the auth check currently just checks `isAuthenticated`. Add an explicit check:
- If authenticated but NOT `isSuperAdmin` → redirect to `/portal`
- If `mustChangePassword` → redirect to `/setup-account`
- Keep existing loading state

- [x] **Step 2: Add username column to employees table**

In `app/(dashboard)/employees/page.tsx`, add a "Username" column to the employees table:
- Add `<TableHead>` for "Username" after the "Name" column
- Add `<TableCell>` showing `employee.username` in monospace font
- The username should display in a muted code style (e.g., `font-mono text-muted-foreground`)

- [x] **Step 3: Update employee creation form**

In `app/(dashboard)/employees/new/page.tsx`:
- Remove the "Account Information" card section (email + password fields) or make both fields optional
- Add a note/callout: "Username and default password will be auto-generated from the employee's name."
- Keep email as an optional field in the Personal Information section
- Remove password field entirely from the form (backend auto-generates)

- [x] **Step 4: Commit**

```bash
git add app/(dashboard)/layout.tsx app/(dashboard)/employees/page.tsx app/(dashboard)/employees/new/page.tsx
git commit -m "feat: update admin dashboard — super-admin guard, username column, optional email/password"
```

---

## Task 15: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [x] **Step 1: Add .superpowers/ to .gitignore**

Add `.superpowers/` to the `.gitignore` file (used by the visual brainstorming companion).

- [x] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```

---

## Task Dependency Map

Tasks that can be executed **in parallel** (no dependencies between them):

**Wave 1 — Foundation (must be sequential):**
- Task 1: Update Types
- Task 2: Extend Mock Data (depends on Task 1 types)
- Task 3: Extend Mock API (depends on Task 2 data)
- Task 4: Create Real API Clients (depends on Task 1 types)
- Task 5: Update Auth Hook (depends on Tasks 3, 4)

**Wave 2 — UI Pages (can run in parallel after Wave 1):**
- Task 6: Update Login Page
- Task 7: Update SSO Login Page
- Task 8: Build Registration Page
- Task 9: Build First-Login Password Stepper
- Task 10: Build Portal Layout
- Task 15: Add .superpowers to .gitignore

**Wave 3 — Portal Pages (depends on Task 10 layout):**
- Task 11: Build Portal Profile Page
- Task 12: Build Portal Applications Page
- Task 13: Build Portal Change Password Page

**Wave 4 — Admin Updates (can run in parallel with Wave 2/3):**
- Task 14: Update Admin Dashboard

```
Wave 1 (sequential):  T1 → T2 → T3 → T4 → T5
Wave 2 (parallel):    T6 | T7 | T8 | T9 | T10 | T15
Wave 3 (parallel):    T11 | T12 | T13  (after T10)
Wave 4 (parallel):    T14  (after T5)
```
