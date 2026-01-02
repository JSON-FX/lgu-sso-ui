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
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Users, AppWindow } from "lucide-react";
import { mockApplicationApi, mockEmployeeApi } from "@/lib/mock";
import { Application, Employee, Role, ApplicationEmployee } from "@/types";
import { toast } from "sonner";

const roleOptions: { value: Role; label: string }[] = [
  { value: "guest", label: "Guest" },
  { value: "standard", label: "Standard" },
  { value: "administrator", label: "Administrator" },
  { value: "super_administrator", label: "Super Administrator" },
];

export default function ApplicationEmployeesPage() {
  const params = useParams();
  const uuid = params.uuid as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [appEmployees, setAppEmployees] = useState<ApplicationEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add access dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("standard");
  const [isAdding, setIsAdding] = useState(false);

  // Edit role dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ApplicationEmployee | null>(null);
  const [editRole, setEditRole] = useState<Role>("standard");
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<ApplicationEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [appRes, employeesRes, appEmployeesRes] = await Promise.all([
        mockApplicationApi.get(uuid),
        mockEmployeeApi.list(),
        mockApplicationApi.getEmployees(uuid),
      ]);
      setApplication(appRes.data);
      setAllEmployees(employeesRes.data);
      setAppEmployees(appEmployeesRes.data);
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

  const availableEmployees = allEmployees.filter(
    (emp) => !appEmployees.some((ae) => ae.uuid === emp.uuid)
  );

  const handleAddAccess = async () => {
    if (!selectedEmployee) return;

    setIsAdding(true);
    try {
      await mockApplicationApi.grantAccess(uuid, selectedEmployee, selectedRole);
      toast.success("Access granted successfully");
      setAddDialogOpen(false);
      setSelectedEmployee("");
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
    if (!editingEmployee) return;

    setIsEditing(true);
    try {
      await mockApplicationApi.updateAccess(uuid, editingEmployee.uuid, editRole);
      toast.success("Role updated successfully");
      setEditDialogOpen(false);
      setEditingEmployee(null);
      loadData();
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setIsEditing(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!deletingEmployee) return;

    setIsDeleting(true);
    try {
      await mockApplicationApi.revokeAccess(uuid, deletingEmployee.uuid);
      toast.success("Access revoked successfully");
      setDeleteDialogOpen(false);
      setDeletingEmployee(null);
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

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="link" asChild>
          <Link href="/applications">Back to applications</Link>
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
            <Link href={`/applications/${uuid}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/30">
              <AppWindow className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{application.name}</h1>
              <p className="text-muted-foreground">Employee Access Management</p>
            </div>
          </div>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableEmployees.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Grant Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Employee Access</DialogTitle>
              <DialogDescription>
                Select an employee and role to grant access to {application.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.uuid} value={emp.uuid}>
                        {emp.full_name}
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
              <Button onClick={handleAddAccess} disabled={!selectedEmployee || isAdding}>
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

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Access
          </CardTitle>
          <CardDescription>
            {appEmployees.length} employee{appEmployees.length !== 1 ? "s" : ""} with access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Employee Access</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No employees have been granted access to this application yet.
              </p>
              <Button
                className="mt-4"
                onClick={() => setAddDialogOpen(true)}
                disabled={availableEmployees.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Grant First Access
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appEmployees.map((emp) => (
                  <TableRow key={emp.uuid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {emp.initials}
                        </div>
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {emp.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingEmployee(emp);
                            setEditRole(emp.role);
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
                            setDeletingEmployee(emp);
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
              Change the role for {editingEmployee?.full_name}.
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
              Are you sure you want to revoke access for {deletingEmployee?.full_name}? They will no
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
