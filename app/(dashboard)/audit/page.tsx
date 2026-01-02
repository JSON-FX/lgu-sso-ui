"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  ScrollText,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  UserCog,
  Key,
  Shield,
  Settings,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuditLog, Employee, Application, AuditLogFilters } from "@/types";
import { format } from "date-fns";

const actionTypes = [
  { value: "login", label: "Login", icon: LogIn },
  { value: "logout", label: "Logout", icon: LogOut },
  { value: "employee_created", label: "Employee Created", icon: UserPlus },
  { value: "employee_deleted", label: "Employee Deleted", icon: UserMinus },
  { value: "employee_updated", label: "Employee Updated", icon: UserCog },
  { value: "access_granted", label: "Access Granted", icon: Key },
  { value: "access_revoked", label: "Access Revoked", icon: Shield },
  { value: "role_updated", label: "Role Updated", icon: Settings },
];

const getActionIcon = (action: string) => {
  const actionType = actionTypes.find((a) => a.value === action);
  return actionType?.icon || ScrollText;
};

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case "login":
    case "access_granted":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "logout":
    case "access_revoked":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "employee_created":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "employee_deleted":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "employee_updated":
    case "role_updated":
      return "bg-amber-500/10 text-amber-700 border-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [employeeComboboxOpen, setEmployeeComboboxOpen] = useState(false);
  const [applicationComboboxOpen, setApplicationComboboxOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    action: undefined,
    employee_uuid: undefined,
    application_uuid: undefined,
    from: undefined,
    to: undefined,
  });

  // Active filters display
  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== ""
  ).length;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, employeesRes, appsRes] = await Promise.all([
        api.audit.list({ ...filters, page, per_page: 15 }),
        api.employees.list(1, 100),
        api.applications.list(),
      ]);

      setLogs(logsRes.data);
      setTotalPages(logsRes.meta.last_page);
      setTotal(logsRes.meta.total);
      setEmployees(employeesRes.data);
      setApplications(appsRes.data);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, filters]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" || value === "" ? undefined : value,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      action: undefined,
      employee_uuid: undefined,
      application_uuid: undefined,
      from: undefined,
      to: undefined,
    });
    setPage(1);
  };

  const handleRefresh = () => {
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Filter Audit Logs</DialogTitle>
                <DialogDescription>
                  Narrow down the audit logs by specific criteria
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select
                    value={filters.action || "all"}
                    onValueChange={(value) => handleFilterChange("action", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      {actionTypes.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Popover open={employeeComboboxOpen} onOpenChange={setEmployeeComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={employeeComboboxOpen}
                        className="w-full justify-between font-normal"
                      >
                        {filters.employee_uuid
                          ? employees.find((emp) => emp.uuid === filters.employee_uuid)?.full_name
                          : "All employees"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search employees..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                handleFilterChange("employee_uuid", undefined);
                                setEmployeeComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  !filters.employee_uuid ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              All employees
                            </CommandItem>
                            {employees.map((emp) => (
                              <CommandItem
                                key={emp.uuid}
                                value={emp.full_name}
                                onSelect={() => {
                                  handleFilterChange("employee_uuid", emp.uuid);
                                  setEmployeeComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filters.employee_uuid === emp.uuid ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {emp.full_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Application</Label>
                  <Popover open={applicationComboboxOpen} onOpenChange={setApplicationComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={applicationComboboxOpen}
                        className="w-full justify-between font-normal"
                      >
                        {filters.application_uuid
                          ? applications.find((app) => app.uuid === filters.application_uuid)?.name
                          : "All applications"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search applications..." />
                        <CommandList>
                          <CommandEmpty>No application found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                handleFilterChange("application_uuid", undefined);
                                setApplicationComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  !filters.application_uuid ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              All applications
                            </CommandItem>
                            {applications.map((app) => (
                              <CommandItem
                                key={app.uuid}
                                value={app.name}
                                onSelect={() => {
                                  handleFilterChange("application_uuid", app.uuid);
                                  setApplicationComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filters.application_uuid === app.uuid ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {app.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="date"
                        value={filters.from || ""}
                        onChange={(e) => handleFilterChange("from", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="date"
                        value={filters.to || ""}
                        onChange={(e) => handleFilterChange("to", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearFilters}
                    disabled={activeFiltersCount === 0}
                  >
                    Clear All
                  </Button>
                  <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.action && (
            <Badge variant="secondary" className="gap-1">
              Action: {actionTypes.find((a) => a.value === filters.action)?.label}
              <button onClick={() => handleFilterChange("action", undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.employee_uuid && (
            <Badge variant="secondary" className="gap-1">
              Employee: {employees.find((e) => e.uuid === filters.employee_uuid)?.full_name}
              <button onClick={() => handleFilterChange("employee_uuid", undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.application_uuid && (
            <Badge variant="secondary" className="gap-1">
              App: {applications.find((a) => a.uuid === filters.application_uuid)?.name}
              <button onClick={() => handleFilterChange("application_uuid", undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filters.from || filters.to) && (
            <Badge variant="secondary" className="gap-1">
              Date: {filters.from || "..."} - {filters.to || "..."}
              <button
                onClick={() => {
                  handleFilterChange("from", undefined);
                  handleFilterChange("to", undefined);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            {total} total log{total !== 1 ? "s" : ""} • Showing page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Application</TableHead>
                <TableHead className="w-[200px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No audit logs found</p>
                      {activeFiltersCount > 0 && (
                        <Button variant="link" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${getActionBadgeVariant(log.action)}`}
                        >
                          <ActionIcon className="h-3 w-3" />
                          {actionTypes.find((a) => a.value === log.action)?.label || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.employee ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {log.employee.initials}
                            </div>
                            <span className="text-sm">{log.employee.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.application ? (
                          <span className="text-sm">{log.application.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {log.details || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
