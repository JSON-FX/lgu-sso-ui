"use client";

import { useEffect, useState } from "react";
import { portalApi } from "@/lib/api";
import type { EmployeeApplication } from "@/types/employee";
import type { Role } from "@/types/employee";

const roleBadgeStyles: Record<Role, string> = {
  guest: "bg-blue-500/15 text-blue-400",
  standard: "bg-green-500/15 text-green-400",
  administrator: "bg-amber-500/15 text-amber-400",
  super_administrator: "bg-purple-500/15 text-purple-400",
};

export default function PortalApplicationsPage() {
  const [applications, setApplications] = useState<EmployeeApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const data = await portalApi.getApplications();
        setApplications(data);
      } catch {
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadApplications();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-muted-foreground">
          Applications you have access to
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-3 w-64 bg-muted rounded" />
                </div>
                <div className="h-6 w-24 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          You don&apos;t have access to any applications yet.
        </p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.uuid}
              className="bg-card border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{app.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(app as EmployeeApplication & { description?: string })
                    ?.description || ""}
                </p>
              </div>
              <span
                className={`text-xs uppercase tracking-wide px-3 py-1 rounded-full ${roleBadgeStyles[app.role]}`}
              >
                {app.role.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
