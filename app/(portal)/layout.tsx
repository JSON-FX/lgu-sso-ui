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
