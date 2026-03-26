"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

export function PortalHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const initials = user?.initials || "U";
  const displayName = user?.full_name || "User";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-6">
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-3">
        <img src="/lgu-seal.png" alt="LGU Quezon" className="w-7 h-7 rounded-full" />
        <span className="font-semibold text-sidebar-foreground">
          LGU Portal
        </span>
      </div>

      {/* Right side - Username and avatar */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{displayName}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground outline-none hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
