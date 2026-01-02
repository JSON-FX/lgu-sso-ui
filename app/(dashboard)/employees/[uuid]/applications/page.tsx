"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Key, AppWindow } from "lucide-react";
import { mockEmployeeApi, mockApplicationApi } from "@/lib/mock";
import { Employee, Application, Role, EmployeeApplication } from "@/types";
import { toast } from "sonner";

const roleOptions: { value: Role; label: string }[] = [
  { value: "guest", label: "Guest" },
  { value: "standard", label: "Standard" },
  { value: "administrator", label: "Administrator" },
  { value: "super_administrator", label: "Super Administrator" },
];

export default function EmployeeApplicationsPage() {
  const params = useParams();
  const uuid = params.uuid as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [employeeApps, setEmployeeApps] = useState<EmployeeApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add access dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("standard");
  const [isAdding, setIsAdding] = useState(false);

  // Edit role dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<EmployeeApplication | null>(null);
  const [editRole, setEditRole] = useState<Role>("standard");
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingApp, setDeletingApp] = useState<EmployeeApplication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [employeeRes, appsRes, employeeAppsRes] = await Promise.all([
        mockEmployeeApi.get(uuid),
        mockApplicationApi.list(),
        mockEmployeeApi.getApplications(uuid),
      ]);
      setEmployee(employeeRes.data);
      setAllApplications(appsRes.data);
      setEmployeeApps(employeeAppsRes.data);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [uuid]);

  const availableApps = allApplications.filter(
    (app) => !employeeApps.some((ea) => ea.uuid === app.uuid)
  );

  const handleAddAccess = async () => {
    if (!selectedApp) return;

    setIsAdding(true);
    try {
      await mockEmployeeApi.grantAccess(uuid, selectedApp, selectedRole);
      toast.success("Access granted successfully");
      setAddDialogOpen(false);
      setSelectedApp("");
      setSelectedRole("standard");
      loadData();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to grant access");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditRole = async () => {
    if (!editingApp) return;

    setIsEditing(true);
    try {
      await mockEmployeeApi.updateAccess(uuid, editingApp.uuid, editRole);
      toast.success("Role updated successfully");
      setEditDialogOpen(false);
      setEditingApp(null);
      loadData();
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setIsEditing(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!deletingApp) return;

    setIsDeleting(true);
    try {
      await mockEmployeeApi.revokeAccess(uuid, deletingApp.uuid);
      toast.success("Access revoked successfully");
      setDeleteDialogOpen(false);
      setDeletingApp(null);
      loadData();
    } catch (error) {
      toast.error("Failed to revoke access");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Employee not found</p>
        <Button variant="link" asChild>
          <Link href="/employees">Back to employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/employees/${uuid}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {employee.initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">Application Access Management</p>
            </div>
          </div>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableApps.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Grant Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Application Access</DialogTitle>
              <DialogDescription>
                Select an application and role to grant access to {employee.full_name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Application</label>
                <Select value={selectedApp} onValueChange={setSelectedApp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApps.map((app) => (
                      <SelectItem key={app.uuid} value={app.uuid}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccess} disabled={!selectedApp || isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Granting...
                  </>
                ) : (
                  "Grant Access"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Application Access
          </CardTitle>
          <CardDescription>
            {employeeApps.length} application{employeeApps.length !== 1 ? "s" : ""} with access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeeApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AppWindow className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Application Access</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This employee doesn&apos;t have access to any applications yet.
              </p>
              <Button className="mt-4" onClick={() => setAddDialogOpen(true)} disabled={availableApps.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Grant First Access
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeApps.map((app) => (
                  <TableRow key={app.uuid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/30">
                          <AppWindow className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{app.name}</p>
                          <p className="text-xs text-muted-foreground">{app.uuid}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {app.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingApp(app);
                            setEditRole(app.role);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingApp(app);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingApp?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={isEditing}>
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access to {deletingApp?.name}? This employee will no
              longer be able to use this application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeAccess} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
