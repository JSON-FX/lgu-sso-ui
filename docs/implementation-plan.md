# LGU-SSO Admin UI - Implementation Plan

## Project Overview

**Purpose:** Administrator UI for LGU-SSO to manage employees, applications, roles, and view audit logs.

**Tech Stack:**
- Next.js 14+ (App Router)
- shadcn/ui component library
- Tailwind CSS
- TypeScript

**Backend Reference:** `/Users/jsonse/Documents/development/LGU-SSO/docs/documentation/`

---

## Access Control

- **Required Role:** `super_administrator` only
- **Authentication:** Self-hosted login form calling `/api/v1/auth/login`
- **Session:** JWT token stored in httpOnly cookie

---

## Core Features

### 1. Authentication

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Login | `POST /auth/login` | Admin login with email/password |
| Logout | `POST /auth/logout` | Revoke current token |
| Get Profile | `GET /auth/me` | Fetch current user + verify super_admin role |

**Implementation Notes:**
- Login page at `/login`
- Middleware to protect all routes except `/login`
- Verify user has `super_administrator` role on any app (ideally the SSO Admin app itself)
- Store token in httpOnly cookie for security
- Redirect to dashboard after successful login

---

### 2. Dashboard

**Route:** `/dashboard`

**Components:**
- Summary cards: Total Employees, Total Applications, Active Sessions (if available)
- Recent audit activity (last 10 events)
- Quick actions: Add Employee, Add Application

**API Calls:**
- `GET /employees` (for count via meta.total)
- `GET /applications` (for count)
- `GET /audit/logs?per_page=10` (recent activity)

---

### 3. Employee Management

**Routes:**
- `/employees` - List all employees
- `/employees/new` - Create employee form
- `/employees/[uuid]` - View/Edit employee details
- `/employees/[uuid]/applications` - Manage employee's app access

#### 3.1 Employee List (`/employees`)

**Features:**
- Paginated table with columns: Name, Email, Status, Created Date, Actions
- Search by name or email
- Filter by status (active/inactive)
- Pagination controls

**API:** `GET /employees?page={page}&per_page={per_page}`

#### 3.2 Create Employee (`/employees/new`)

**Form Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| first_name | text | Yes | Min 2 chars |
| middle_name | text | No | - |
| last_name | text | Yes | Min 2 chars |
| suffix | text | No | - |
| email | email | Yes | Valid email, unique |
| password | password | Yes | Min 8 chars |
| birthday | date | Yes | Must be in past |
| civil_status | select | Yes | single/married/widowed/separated/divorced |
| nationality | text | Yes | Default: "Filipino" |
| province | select | Yes | Cascading from /locations/provinces |
| city | select | Yes | Cascading from /locations/provinces/{code}/cities |
| barangay | select | Yes | Cascading from /locations/cities/{code}/barangays |
| residence | textarea | Yes | Full address |

**API:** `POST /employees`

#### 3.3 View/Edit Employee (`/employees/[uuid]`)

**Tabs:**
1. **Profile** - View/edit employee details
2. **Applications** - Manage app access (separate route)

**API:**
- `GET /employees/{uuid}` - Fetch details
- `PUT /employees/{uuid}` - Update details
- `DELETE /employees/{uuid}` - Soft delete (with confirmation modal)

#### 3.4 Employee App Access (`/employees/[uuid]/applications`)

**Features:**
- List apps the employee has access to with their role
- Add access to new app (modal with app select + role select)
- Edit role for existing app access
- Revoke access to app

**API:**
- `GET /employees/{uuid}/applications` - List access
- `POST /employees/{uuid}/applications` - Grant access
- `PUT /employees/{uuid}/applications/{app_uuid}` - Update role
- `DELETE /employees/{uuid}/applications/{app_uuid}` - Revoke access

---

### 4. Application Management

**Routes:**
- `/applications` - List all applications
- `/applications/new` - Register new application
- `/applications/[uuid]` - View/Edit application details
- `/applications/[uuid]/employees` - View employees with access

#### 4.1 Application List (`/applications`)

**Table Columns:** Name, Client ID, Rate Limit, Status, Actions

**API:** `GET /applications`

#### 4.2 Create Application (`/applications/new`)

**Form Fields:**
| Field | Type | Required |
|-------|------|----------|
| name | text | Yes |
| description | textarea | No |
| redirect_uris | multi-input | Yes (at least 1) |
| rate_limit_per_minute | number | Yes (default: 60) |

**API:** `POST /applications`

**Important:** Display the `client_secret` only once after creation with copy button and warning.

#### 4.3 View/Edit Application (`/applications/[uuid]`)

**Sections:**
- Application details (name, description, redirect URIs)
- Client credentials (client_id visible, secret hidden)
- Regenerate secret button (with confirmation)
- Toggle active/inactive status

**API:**
- `GET /applications` (filter by uuid, or add individual endpoint if available)
- `PUT /applications/{uuid}` (if available)
- `POST /applications/{uuid}/regenerate-secret`

#### 4.4 Application Employees (`/applications/[uuid]/employees`)

**Features:**
- List employees with access to this application
- Show role for each employee
- Quick actions to change role or revoke access

**Note:** This may need a custom endpoint or we fetch all employees and filter client-side.

---

### 5. Audit Logs

**Route:** `/audit`

**Features:**
- Paginated table: Timestamp, Action, Employee, Application, IP Address
- Filters:
  - Action type (login, logout, logout_all, token_refresh, token_validate, app_authorize)
  - Employee (autocomplete search)
  - Application (dropdown)
  - Date range (from/to)
- Export to CSV (optional, phase 2)

**API:** `GET /audit/logs?action={action}&employee_uuid={uuid}&application_uuid={uuid}&from={date}&to={date}`

---

## UI/UX Guidelines

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | LGU-SSO Admin | User Menu (logout)   │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Main Content Area                        │
│          │                                          │
│ Dashboard│                                          │
│ Employees│                                          │
│ Apps     │                                          │
│ Audit    │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Component Library Usage (shadcn/ui)

| Component | Usage |
|-----------|-------|
| Button | Actions, form submissions |
| Card | Dashboard stats, detail sections |
| Table | Employee list, app list, audit logs |
| Dialog | Confirmations, quick actions |
| Form | All input forms with react-hook-form |
| Input | Text fields |
| Select | Dropdowns, role selection |
| Tabs | Employee detail sections |
| Badge | Status indicators |
| Toast | Success/error notifications |
| Skeleton | Loading states |
| Pagination | Table pagination |
| Command | Search/autocomplete |
| DatePicker | Date filters |

### Design Principles

1. **Consistent spacing:** Use Tailwind's spacing scale consistently
2. **Responsive:** Mobile-friendly, collapsible sidebar on small screens
3. **Loading states:** Skeleton loaders for all data fetches
4. **Error handling:** Toast notifications for errors, inline validation
5. **Confirmations:** Modal confirmations for destructive actions (delete, revoke, regenerate secret)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + header layout
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── employees/
│   │   │   ├── page.tsx        # List
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # Create
│   │   │   └── [uuid]/
│   │   │       ├── page.tsx    # View/Edit
│   │   │       └── applications/
│   │   │           └── page.tsx
│   │   ├── applications/
│   │   │   ├── page.tsx        # List
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # Create
│   │   │   └── [uuid]/
│   │   │       ├── page.tsx    # View/Edit
│   │   │       └── employees/
│   │   │           └── page.tsx
│   │   └── audit/
│   │       └── page.tsx
│   ├── api/                    # API routes for server-side calls
│   │   └── auth/
│   │       └── [...nextauth]/  # Or custom auth handlers
│   ├── layout.tsx
│   └── page.tsx                # Redirect to /dashboard or /login
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── user-menu.tsx
│   ├── employees/
│   │   ├── employee-table.tsx
│   │   ├── employee-form.tsx
│   │   └── employee-app-access.tsx
│   ├── applications/
│   │   ├── app-table.tsx
│   │   ├── app-form.tsx
│   │   └── app-secret-display.tsx
│   └── audit/
│       ├── audit-table.tsx
│       └── audit-filters.tsx
├── lib/
│   ├── api.ts                  # API client (fetch wrapper)
│   ├── auth.ts                 # Auth utilities
│   └── utils.ts                # Helpers
├── hooks/
│   ├── use-auth.ts
│   └── use-employees.ts        # Data fetching hooks (SWR or React Query)
├── types/
│   ├── employee.ts
│   ├── application.ts
│   └── audit.ts
└── middleware.ts               # Auth protection
```

---

## Implementation Phases

### Phase 1: Foundation
1. Set up Next.js project with App Router
2. Install and configure shadcn/ui + Tailwind
3. Create base layout (sidebar, header)
4. Implement authentication (login, middleware, token storage)
5. Create API client utility

### Phase 2: Employee Management
1. Employee list with pagination and search
2. Create employee form with location cascading
3. View/edit employee page
4. Employee app access management

### Phase 3: Application Management
1. Application list
2. Create application with secret display
3. View/edit application
4. Regenerate secret functionality
5. Application employees view

### Phase 4: Dashboard & Audit
1. Dashboard with stats cards
2. Recent activity feed on dashboard
3. Audit log page with filters
4. Date range filtering

### Phase 5: Polish
1. Responsive design refinements
2. Loading states and error handling
3. Toast notifications
4. Accessibility improvements
5. Final testing pass

---

## Testing Requirements (Playwright MCP)

**IMPORTANT:** Every implemented UI component MUST be tested using the Playwright MCP tools before moving to the next component.

### Testing Checklist for Each Component

After implementing any UI component, use Playwright MCP to verify:

| Check | Playwright MCP Tool | What to Verify |
|-------|---------------------|----------------|
| **Visual Rendering** | `browser_snapshot` / `browser_take_screenshot` | Component renders correctly, layout matches design |
| **Console Errors** | `browser_console_messages` | No JavaScript errors, warnings, or React hydration issues |
| **Network Requests** | `browser_network_requests` | API calls are made correctly, responses are handled |
| **HTML Structure** | `browser_snapshot` | Correct semantic HTML, proper accessibility attributes |
| **Styling** | `browser_take_screenshot` | Tailwind classes applied, responsive design works |
| **Interactions** | `browser_click` / `browser_fill_form` / `browser_type` | Buttons, forms, modals work as expected |
| **Navigation** | `browser_navigate` | Routes work, redirects function properly |
| **Error States** | `browser_console_messages` + `browser_snapshot` | Error handling displays correctly |

### Testing Workflow

For each component/page implementation:

1. **Start the dev server** and navigate to the component using `browser_navigate`
2. **Take a snapshot** with `browser_snapshot` to verify initial render
3. **Check console** with `browser_console_messages` for any errors
4. **Inspect network** with `browser_network_requests` to verify API calls
5. **Test interactions** using `browser_click`, `browser_fill_form`, `browser_type`
6. **Take screenshot** with `browser_take_screenshot` for visual verification
7. **Test responsive** by using `browser_resize` for different viewport sizes

### Component-Specific Tests

| Component | Key Tests |
|-----------|-----------|
| **Login Page** | Form submission, validation errors, redirect on success, console for auth errors |
| **Dashboard** | Stats cards load data, recent activity renders, network requests for counts |
| **Employee List** | Table renders, pagination works, search filters, network requests |
| **Employee Form** | All fields render, cascading selects work, validation, form submission |
| **Application List** | Table renders, actions work, network requests |
| **Application Form** | Fields render, redirect_uris multi-input, secret display after create |
| **Audit Logs** | Table renders, filters work, date picker, network requests with params |
| **Layout** | Sidebar navigation, responsive collapse, user menu dropdown |

### Example Test Sequence

```
1. browser_navigate → http://localhost:3000/employees
2. browser_console_messages → Check for errors
3. browser_network_requests → Verify GET /employees called
4. browser_snapshot → Verify table structure
5. browser_fill_form → Enter search term
6. browser_click → Click search button
7. browser_network_requests → Verify filtered request
8. browser_take_screenshot → Document final state
```

**Note:** Do NOT proceed to the next component until all tests pass for the current component.

---

## Environment Variables

```env
# Backend API
LGU_SSO_BASE_URL=http://lgu-sso.test
LGU_SSO_CLIENT_ID=admin-ui-client-id
LGU_SSO_CLIENT_SECRET=admin-ui-client-secret

# App
NEXT_PUBLIC_APP_NAME=LGU-SSO Admin
```

**Note:** The backend LGU-SSO API is accessible at `http://lgu-sso.test/api/v1/`

---

## Mock API (Development Mode)

During frontend development, the application uses a mock API to avoid backend dependencies.

### Mock Login Credentials

```
Email: maria.delacruz@lgu.gov.ph
Password: admin123
```

### Mock Data Includes

- **8 Employees** - Various roles, statuses, and departments
- **6 Applications** - Including active and inactive apps
- **10 Audit Logs** - Recent activity with various action types
- **Philippine Locations** - Sample provinces, cities, and barangays

### Switching to Real API

To switch from mock API to real backend:
1. Update `lib/hooks/use-auth.ts` to use real API client instead of mock
2. Update service files to use real API endpoints
3. Ensure backend is running at `http://lgu-sso.test`

---

## API Client Notes

Since this is the **Admin UI** for SSO itself, it will:
1. Use direct API calls with the admin's JWT token (not client credentials for SSO endpoints)
2. The admin must be a `super_administrator` to access admin endpoints
3. Token refresh should be handled automatically
4. All API calls go through server-side routes to keep credentials secure

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Tech Stack | Next.js App Router |
| Auth Method | Self-hosted login form |
| Access Role | Super Admin only |
| App Management | Yes, full CRUD |
| Audit Logs | Yes, with filters |
| UI Library | shadcn/ui |
| Search/Filter | Full search (name, email, status) |
| App-Employees View | Yes |
| Dashboard | Yes, with stats |

---

## Next Steps

1. Review and approve this implementation plan
2. Ensure backend API is accessible and credentials are ready
3. Begin Phase 1 implementation using the frontend-design plugin
