# Portal-Admin Visual Parity

Unify the portal's look, feel, and form fields with the admin dashboard so both share the same layout components and the portal profile form matches the admin employee form 1:1.

## Approach

Refactor the existing admin `Sidebar` and `Header` components to accept configuration props, then use them in both admin and portal layouts. Rebuild the portal profile form to mirror the admin "Add New Employee" form's card-based structure with all the same fields.

## 1. Layout Unification

### Sidebar Refactor (`components/layout/sidebar.tsx`)

Currently hardcodes 4 admin nav items. Change to accept a `navItems` prop:

```ts
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean; // true = exact path match, false = startsWith (default: false)
}

interface SidebarProps {
  navItems: NavItem[];
  branding?: { title: string; subtitle: string };
}
```

- Admin passes: Dashboard, Employees, Applications, Audit Logs (current behavior)
- Portal passes: Profile (`/portal`, exact), Applications (`/portal/applications`), Change Password (`/portal/change-password`)
- Branding defaults to `{ title: "LGU-SSO", subtitle: "Admin Portal" }`. Portal passes `{ title: "LGU-SSO", subtitle: "Portal" }`.
- All visual behavior preserved: dark theme, collapsible, LGU seal, tooltips.

### Header Refactor (`components/layout/header.tsx`)

Add a `showNotifications` prop (default `true`). Portal sets it to `false`.

```ts
interface HeaderProps {
  showNotifications?: boolean; // default true
}
```

Everything else stays the same: welcome message, avatar dropdown, logout.

### Portal Layout (`app/(portal)/layout.tsx`)

Replace `PortalSidebar` + `PortalHeader` with the refactored `Sidebar` + `Header`. Match the admin layout structure:

```tsx
<div className="flex min-h-screen">
  <Sidebar navItems={portalNavItems} branding={{ title: "LGU-SSO", subtitle: "Portal" }} />
  <div className="ml-64 ... transition-all">
    <Header showNotifications={false} />
    <main className="mx-auto max-w-7xl p-6">{children}</main>
  </div>
</div>
```

Same sidebar offset (`ml-64` / `ml-[72px]`), same max-width, same padding as admin.

### Cleanup

Delete `components/portal/portal-sidebar.tsx` and `components/portal/portal-header.tsx`. Remove all imports referencing them.

## 2. Profile Form Redesign (`app/(portal)/portal/page.tsx`)

Rebuild the profile page to use the same card-section pattern as the admin employee form (`app/(dashboard)/employees/new/page.tsx`).

### Card Sections

**Card 1: Personal Information** (icon: `User`)
- Subtitle: "Basic employee details"
- Grid: `md:grid-cols-2`
- Fields:
  - First Name — read-only text display
  - Middle Name — read-only text display
  - Last Name — read-only text display
  - Suffix — editable `Input` (placeholder: "Jr., Sr., III, etc.")
  - Birthday — editable date `Input`
  - Civil Status — editable `Select` (Single, Married, Widowed, Separated, Divorced)
  - Nationality — editable `Input`

**Card 2: Account Credentials** (icon: `Lock`)
- Subtitle: "Login credentials for the employee"
- Fields:
  - Email Address — editable `Input`
  - Username — read-only text display
- Info box (same style as admin): "Username and default password are managed by administrators."

**Card 3: Employment Information** (icon: `Briefcase`)
- Subtitle: "Office assignment and position details"
- Fields:
  - Office — read-only text display (shows office name or "Not set")
  - Position — editable `Input`
  - Date Employed — read-only text display (formatted date or "Not set")

**Card 4: Address** (icon: `MapPin`)
- Subtitle: "Employee's residential address"
- Cascading PSGC dropdowns (same Popover+Command pattern as admin form):
  - Region, Province, City/Municipality, Barangay
- Additional fields:
  - House Number — editable `Input` (placeholder: "e.g., 123")
  - Block Number — editable `Input` (placeholder: "e.g., Block 5")
  - Building/Floor — editable `Input` (placeholder: "e.g., 3rd Floor, Unit 201")
  - Street Address — editable `Textarea` (placeholder: "Street name, subdivision, etc.")

### Read-only Fields Display

Read-only fields render as:
- Label in uppercase muted text (same `Label` component)
- Value in regular weight text below the label
- No input border, no hover state — just text

This matches how the current portal shows First Name, Last Name, etc.

### Save/Cancel Buttons

Bottom of the page, right-aligned (`flex justify-end gap-3`):
- Cancel button (outline variant) — resets form to original profile data
- Save button (default variant, with Loader2 spinner during save)

### Edit Mode

Remove the current edit toggle. The form is always in edit mode for editable fields, with read-only fields always displayed as text. This matches the admin form behavior where you see all fields at once and just fill in what you need.

## 3. Type Changes

### `types/portal.ts`

Add `suffix` to `UpdatePortalProfileData`:

```ts
export interface UpdatePortalProfileData {
  email?: string;
  birthday?: string;
  civil_status?: "single" | "married" | "widowed" | "separated" | "divorced";
  nationality?: string;
  suffix?: string;
  residence?: string;
  block_number?: string;
  building_floor?: string;
  house_number?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  position?: string;
}
```

The field `residence` maps to "Street Address" in the UI (matching the admin form's `residence` field name in the API).

## 4. Files Changed

- `components/layout/sidebar.tsx` — add `navItems` and `branding` props
- `components/layout/header.tsx` — add `showNotifications` prop
- `app/(dashboard)/layout.tsx` — pass admin nav items to Sidebar
- `app/(portal)/layout.tsx` — replace portal components with shared Sidebar+Header
- `app/(portal)/portal/page.tsx` — full rewrite of profile form
- `types/portal.ts` — add `suffix` field
- Delete `components/portal/portal-sidebar.tsx`
- Delete `components/portal/portal-header.tsx`

## 5. Out of Scope

- No changes to the admin employee form
- No changes to the portal applications or change-password pages (they just get the new layout automatically)
- No backend API changes (all fields already supported)
- No new API endpoints
