"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, LayoutGrid, Lock } from "lucide-react";

const navigation = [
  {
    name: "Profile",
    href: "/portal",
    icon: User,
    exact: true,
  },
  {
    name: "Applications",
    href: "/portal/applications",
    icon: LayoutGrid,
    exact: false,
  },
  {
    name: "Change Password",
    href: "/portal/change-password",
    icon: Lock,
    exact: false,
  },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-sidebar p-3">
      <nav className="flex flex-col gap-1">
        {navigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
