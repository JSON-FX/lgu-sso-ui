# Portal-Admin Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the portal layout and profile form with the admin dashboard so both share the same Sidebar/Header components and the portal profile has the same fields as the admin employee form.

**Architecture:** Refactor the admin `Sidebar` and `Header` to accept props (nav items, branding, feature flags), then swap the portal layout to use them. Rewrite the portal profile page using the same card-section pattern as the admin "Add New Employee" form. Delete the old portal-specific layout components.

**Tech Stack:** Next.js 16, React, Tailwind CSS, shadcn/ui, lucide-react, PSGC API

---

### Task 1: Refactor Sidebar to accept nav items and branding props

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Update Sidebar to accept props**

Replace the hardcoded `navigation` array and branding with props. The component signature changes from `Sidebar()` to `Sidebar({ navItems, branding })` with a `NavItem` interface.

```tsx
// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface SidebarProps {
  navItems: NavItem[];
  branding?: { title: string; subtitle: string };
}

export function Sidebar({
  navItems,
  branding = { title: "LGU-SSO", subtitle: "Admin Portal" },
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link href={navItems[0]?.href || "/"} className="flex items-center gap-3">
          <img src="/lgu-seal.png" alt="LGU Quezon" className="w-7 h-7 rounded-full" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                {branding.title}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                {branding.subtitle}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
              )}

              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                )}
              />

              {!collapsed && <span>{item.name}</span>}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="absolute bottom-4 left-0 right-0 px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-sso-ui && npx next build 2>&1 | tail -20`
Expected: Build succeeds (admin dashboard still works since Sidebar now requires props, but dashboard layout already imports it — this will fail because dashboard layout doesn't pass props yet. That's expected — we fix it in the next step.)

Actually, this will cause a build error since the dashboard layout calls `<Sidebar />` with no props. Move to the next step immediately.

- [ ] **Step 3: Update dashboard layout to pass admin nav items**

```tsx
// In app/(dashboard)/layout.tsx, update the import and add nav config:

// Add these imports at the top:
import { LayoutDashboard, Users, AppWindow, ScrollText } from "lucide-react";
import type { NavItem } from "@/components/layout/sidebar";

// Add this constant before the component:
const adminNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Applications", href: "/applications", icon: AppWindow },
  { name: "Audit Logs", href: "/audit", icon: ScrollText },
];

// Update the JSX from:
//   <Sidebar />
// to:
//   <Sidebar navItems={adminNavItems} />
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-sso-ui && npx next build 2>&1 | tail -20`
Expected: Build succeeds. Admin dashboard sidebar works identically to before.

- [ ] **Step 5: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add components/layout/sidebar.tsx app/\(dashboard\)/layout.tsx
git commit -m "refactor: make Sidebar accept navItems and branding props"
```

---

### Task 2: Refactor Header to accept showNotifications prop

**Files:**
- Modify: `components/layout/header.tsx`

- [ ] **Step 1: Add showNotifications prop to Header**

Update the Header component signature and conditionally render the notification bell:

```tsx
// In components/layout/header.tsx

// Change the function signature from:
export function Header() {

// To:
interface HeaderProps {
  showNotifications?: boolean;
}

export function Header({ showNotifications = true }: HeaderProps) {
```

Then wrap the notification button in a conditional:

```tsx
// Replace the notifications Button block:
//   <Button variant="ghost" size="icon" ...>
//     <Bell ... />
//     <span ...>3</span>
//   </Button>
// With:
{showNotifications && (
  <Button
    variant="ghost"
    size="icon"
    className="relative text-muted-foreground hover:text-foreground"
  >
    <Bell className="h-5 w-5" />
    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
      3
    </span>
  </Button>
)}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-sso-ui && npx next build 2>&1 | tail -20`
Expected: Build succeeds. Admin dashboard header still shows notification bell (default `true`).

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add components/layout/header.tsx
git commit -m "refactor: add showNotifications prop to Header"
```

---

### Task 3: Update portal layout to use shared Sidebar and Header

**Files:**
- Modify: `app/(portal)/layout.tsx`
- Delete: `components/portal/portal-sidebar.tsx`
- Delete: `components/portal/portal-header.tsx`

- [ ] **Step 1: Rewrite portal layout**

Replace the entire file `app/(portal)/layout.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar, Header } from "@/components/layout";
import type { NavItem } from "@/components/layout/sidebar";
import { Loader2, User, AppWindow, KeyRound } from "lucide-react";

const portalNavItems: NavItem[] = [
  { name: "Profile", href: "/portal", icon: User, exact: true },
  { name: "Applications", href: "/portal/applications", icon: AppWindow },
  { name: "Change Password", href: "/portal/change-password", icon: KeyRound },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, mustChangePassword, checkAuth } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (mustChangePassword) {
      router.push("/setup-account");
      return;
    }
  }, [isLoading, isAuthenticated, mustChangePassword, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        navItems={portalNavItems}
        branding={{ title: "LGU-SSO", subtitle: "Portal" }}
      />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          sidebarCollapsed ? "ml-[72px]" : "ml-64"
        }`}
      >
        <Header showNotifications={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
```

Note: The `sidebarCollapsed` state in the layout won't sync with the Sidebar's internal state. This is the same pattern the admin layout uses — the margin is hardcoded to `ml-64`. This is a pre-existing limitation that applies to both layouts equally.

- [ ] **Step 2: Delete old portal components**

```bash
rm /Users/jsonse/Documents/development/lgu-sso-ui/components/portal/portal-sidebar.tsx
rm /Users/jsonse/Documents/development/lgu-sso-ui/components/portal/portal-header.tsx
```

- [ ] **Step 3: Check for any remaining imports of deleted files**

Run: `grep -r "portal-sidebar\|portal-header\|PortalSidebar\|PortalHeader" /Users/jsonse/Documents/development/lgu-sso-ui/components /Users/jsonse/Documents/development/lgu-sso-ui/app --include="*.tsx" --include="*.ts"`
Expected: No results (all references were in portal layout, now removed).

- [ ] **Step 4: Verify the app compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-sso-ui && npx next build 2>&1 | tail -20`
Expected: Build succeeds. Portal now uses the same dark sidebar and header as admin.

- [ ] **Step 5: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add app/\(portal\)/layout.tsx
git rm components/portal/portal-sidebar.tsx components/portal/portal-header.tsx
git commit -m "feat: portal layout uses shared Sidebar and Header components"
```

---

### Task 4: Add suffix to UpdatePortalProfileData type

**Files:**
- Modify: `types/portal.ts`

- [ ] **Step 1: Add suffix field**

In `types/portal.ts`, add `suffix` to the interface:

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

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add types/portal.ts
git commit -m "feat: add suffix to UpdatePortalProfileData type"
```

---

### Task 5: Rewrite portal profile page with admin-style card sections

**Files:**
- Modify: `app/(portal)/portal/page.tsx`

This is the largest task. The portal profile page gets completely rewritten to use the same card-section pattern as the admin employee form, with 4 cards: Personal Information, Account Credentials, Employment Information, and Address.

- [ ] **Step 1: Write the new portal profile page**

Replace the entire file `app/(portal)/portal/page.tsx` with the following. Key differences from the admin "Add New Employee" form:
- Read-only fields (first name, middle name, last name, username, office, date employed) are rendered as text using `ProfileField`
- No edit toggle — editable fields are always inputs, read-only fields are always text
- Uses `portalApi.updateProfile()` instead of `api.employees.create()`
- Loads profile data on mount, sends only changed fields on save

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Save, X, Check, ChevronsUpDown, User, Lock, Briefcase, MapPin, Info } from "lucide-react";
import { toast } from "sonner";
import { portalApi } from "@/lib/api";
import { psgcApi, PSGCRegion, PSGCProvince, PSGCMunicipality, PSGCBarangay } from "@/lib/api/psgc";
import type { Employee } from "@/types/employee";
import type { UpdatePortalProfileData } from "@/types/portal";

interface FormData {
  email: string;
  birthday: string;
  civil_status: Employee["civil_status"];
  nationality: string;
  suffix: string;
  position: string;
  residence: string;
  house_number: string;
  block_number: string;
  building_floor: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
}

function ProfileField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <p className={`text-sm pt-1 ${mono ? "font-mono" : ""}`}>{value}</p>
      ) : (
        <p className="text-sm pt-1 text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    birthday: "",
    civil_status: "single",
    nationality: "",
    suffix: "",
    position: "",
    residence: "",
    house_number: "",
    block_number: "",
    building_floor: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
  });

  // PSGC lists
  const [regions, setRegions] = useState<PSGCRegion[]>([]);
  const [provinces, setProvinces] = useState<PSGCProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCMunicipality[]>([]);
  const [barangays, setBarangays] = useState<PSGCBarangay[]>([]);

  // Selected codes for cascading
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");

  // Popover open states
  const [regionOpen, setRegionOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [barangayOpen, setBarangayOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await portalApi.getProfile();
        setProfile(data);
        setFormData({
          email: data.email || "",
          birthday: data.birthday || "",
          civil_status: data.civil_status || "single",
          nationality: data.nationality || "",
          suffix: data.suffix || "",
          position: data.position || "",
          residence: data.residence || "",
          house_number: data.house_number || "",
          block_number: data.block_number || "",
          building_floor: data.building_floor || "",
          region: data.region || "",
          province: data.province || "",
          city: data.city || "",
          barangay: data.barangay || "",
        });
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
    psgcApi.getRegions().then(setRegions).catch(console.error);
  }, []);

  const handleRegionChange = async (code: string, name: string) => {
    setSelectedRegionCode(code);
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setFormData((prev) => ({ ...prev, region: name, province: "", city: "", barangay: "" }));
    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);

    if (code) {
      try {
        const data = await psgcApi.getProvinces(code);
        setProvinces(data);
      } catch (error) {
        console.error("Failed to load provinces:", error);
      }
    }
  };

  const handleProvinceChange = async (code: string, name: string) => {
    setSelectedProvinceCode(code);
    setSelectedCityCode("");
    setFormData((prev) => ({ ...prev, province: name, city: "", barangay: "" }));
    setMunicipalities([]);
    setBarangays([]);

    if (code) {
      try {
        const data = await psgcApi.getMunicipalities(code);
        setMunicipalities(data);
      } catch (error) {
        console.error("Failed to load municipalities:", error);
      }
    }
  };

  const handleMunicipalityChange = async (code: string, name: string) => {
    setSelectedCityCode(code);
    setFormData((prev) => ({ ...prev, city: name, barangay: "" }));
    setBarangays([]);

    if (code) {
      try {
        const data = await psgcApi.getBarangays(code);
        setBarangays(data);
      } catch (error) {
        console.error("Failed to load barangays:", error);
      }
    }
  };

  function handleCancel() {
    if (!profile) return;
    setFormData({
      email: profile.email || "",
      birthday: profile.birthday || "",
      civil_status: profile.civil_status || "single",
      nationality: profile.nationality || "",
      suffix: profile.suffix || "",
      position: profile.position || "",
      residence: profile.residence || "",
      house_number: profile.house_number || "",
      block_number: profile.block_number || "",
      building_floor: profile.building_floor || "",
      region: profile.region || "",
      province: profile.province || "",
      city: profile.city || "",
      barangay: profile.barangay || "",
    });
    setSelectedRegionCode("");
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);
  }

  async function handleSave() {
    if (!profile) return;

    setIsSaving(true);

    const changes: UpdatePortalProfileData = {};

    if (formData.email !== (profile.email || "")) changes.email = formData.email;
    if (formData.birthday !== (profile.birthday || "")) changes.birthday = formData.birthday;
    if (formData.civil_status !== profile.civil_status) changes.civil_status = formData.civil_status;
    if (formData.nationality !== (profile.nationality || "")) changes.nationality = formData.nationality;
    if (formData.suffix !== (profile.suffix || "")) changes.suffix = formData.suffix;
    if (formData.position !== (profile.position || "")) changes.position = formData.position;
    if (formData.residence !== (profile.residence || "")) changes.residence = formData.residence;
    if (formData.house_number !== (profile.house_number || "")) changes.house_number = formData.house_number;
    if (formData.block_number !== (profile.block_number || "")) changes.block_number = formData.block_number;
    if (formData.building_floor !== (profile.building_floor || "")) changes.building_floor = formData.building_floor;
    if (formData.region !== (profile.region || "")) changes.region = formData.region;
    if (formData.province !== (profile.province || "")) changes.province = formData.province;
    if (formData.city !== (profile.city || "")) changes.city = formData.city;
    if (formData.barangay !== (profile.barangay || "")) changes.barangay = formData.barangay;

    if (Object.keys(changes).length === 0) {
      setIsSaving(false);
      toast.info("No changes to save");
      return;
    }

    try {
      const updated = await portalApi.updateProfile(changes);
      setProfile(updated);
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and update your personal information</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Basic employee details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <ProfileField label="First Name" value={profile?.first_name} />
          <ProfileField label="Middle Name" value={profile?.middle_name} />
          <ProfileField label="Last Name" value={profile?.last_name} />
          <div className="space-y-2">
            <Label htmlFor="suffix">Suffix</Label>
            <Input
              id="suffix"
              value={formData.suffix}
              onChange={(e) => setFormData((prev) => ({ ...prev, suffix: e.target.value }))}
              placeholder="Jr., Sr., III, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData((prev) => ({ ...prev, birthday: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="civil_status">Civil Status</Label>
            <Select
              value={formData.civil_status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, civil_status: value as Employee["civil_status"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
                <SelectItem value="separated">Separated</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              onChange={(e) => setFormData((prev) => ({ ...prev, nationality: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Account Credentials
          </CardTitle>
          <CardDescription>Login credentials for the employee</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="employee@lgu.gov.ph"
            />
          </div>
          <ProfileField label="Username" value={profile?.username} mono />
          <div className="md:col-span-2">
            <div className="bg-muted/50 border rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Username and default password are managed by administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Information
          </CardTitle>
          <CardDescription>Office assignment and position details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <ProfileField label="Office" value={profile?.office?.name} />
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              placeholder="e.g., Budget Analyst, Administrative Clerk"
            />
          </div>
          <ProfileField
            label="Date Employed"
            value={profile?.date_employed}
          />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
          <CardDescription>Employee&apos;s residential address</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Region */}
          <div className="space-y-2">
            <Label>Region</Label>
            <Popover open={regionOpen} onOpenChange={setRegionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={regionOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.region || "Select region"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search region..." />
                  <CommandList>
                    <CommandEmpty>No region found.</CommandEmpty>
                    <CommandGroup>
                      {regions.map((r) => (
                        <CommandItem
                          key={r.code}
                          value={r.name}
                          onSelect={() => {
                            handleRegionChange(r.code, r.name);
                            setRegionOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedRegionCode === r.code ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {r.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label>Province</Label>
            <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={provinceOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedRegionCode}
                >
                  {formData.province || "Select province"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search province..." />
                  <CommandList>
                    <CommandEmpty>No province found.</CommandEmpty>
                    <CommandGroup>
                      {provinces.map((p) => (
                        <CommandItem
                          key={p.code}
                          value={p.name}
                          onSelect={() => {
                            handleProvinceChange(p.code, p.name);
                            setProvinceOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedProvinceCode === p.code ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* City/Municipality */}
          <div className="space-y-2">
            <Label>City/Municipality</Label>
            <Popover open={municipalityOpen} onOpenChange={setMunicipalityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={municipalityOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedProvinceCode}
                >
                  {formData.city || "Select city/municipality"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search city/municipality..." />
                  <CommandList>
                    <CommandEmpty>No city/municipality found.</CommandEmpty>
                    <CommandGroup>
                      {municipalities.map((m) => (
                        <CommandItem
                          key={m.code}
                          value={m.name}
                          onSelect={() => {
                            handleMunicipalityChange(m.code, m.name);
                            setMunicipalityOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedCityCode === m.code ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {m.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Barangay */}
          <div className="space-y-2">
            <Label>Barangay</Label>
            <Popover open={barangayOpen} onOpenChange={setBarangayOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={barangayOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedCityCode}
                >
                  {formData.barangay || "Select barangay"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search barangay..." />
                  <CommandList>
                    <CommandEmpty>No barangay found.</CommandEmpty>
                    <CommandGroup>
                      {barangays.map((b) => (
                        <CommandItem
                          key={b.code}
                          value={b.name}
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, barangay: b.name }));
                            setBarangayOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              formData.barangay === b.name ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {b.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* House Number */}
          <div className="space-y-2">
            <Label htmlFor="house_number">House Number</Label>
            <Input
              id="house_number"
              value={formData.house_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, house_number: e.target.value }))}
              placeholder="e.g., 123"
            />
          </div>

          {/* Block Number */}
          <div className="space-y-2">
            <Label htmlFor="block_number">Block Number</Label>
            <Input
              id="block_number"
              value={formData.block_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, block_number: e.target.value }))}
              placeholder="e.g., Block 5"
            />
          </div>

          {/* Building/Floor */}
          <div className="space-y-2">
            <Label htmlFor="building_floor">Building/Floor</Label>
            <Input
              id="building_floor"
              value={formData.building_floor}
              onChange={(e) => setFormData((prev) => ({ ...prev, building_floor: e.target.value }))}
              placeholder="e.g., 3rd Floor, Unit 201"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="residence">Street Address</Label>
            <Textarea
              id="residence"
              value={formData.residence}
              onChange={(e) => setFormData((prev) => ({ ...prev, residence: e.target.value }))}
              rows={2}
              placeholder="Street name, subdivision, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Save/Cancel */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-sso-ui && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add app/\(portal\)/portal/page.tsx
git commit -m "feat: rewrite portal profile with admin-style card sections and all fields"
```

---

### Task 6: Clean up unused portal components directory

**Files:**
- Check: `components/portal/` directory

- [ ] **Step 1: Check if portal directory is now empty**

```bash
ls /Users/jsonse/Documents/development/lgu-sso-ui/components/portal/
```

If the directory is empty or only contains files no longer imported anywhere, remove it:

```bash
rmdir /Users/jsonse/Documents/development/lgu-sso-ui/components/portal/ 2>/dev/null || true
```

If other files remain (unlikely), leave them.

- [ ] **Step 2: Final build verification**

Run: `cd /Users/jsonse/Documents/development/lgu-sso-ui && npx next build 2>&1 | tail -30`
Expected: Build succeeds with no warnings about missing modules.

- [ ] **Step 3: Commit if cleanup was done**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add -A
git commit -m "chore: remove empty portal components directory"
```
