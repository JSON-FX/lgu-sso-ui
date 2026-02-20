"use client";

import { Employee } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, MapPin, User, Briefcase, Calendar } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface ViewEmployeeModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewEmployeeModal({ employee, open, onOpenChange }: ViewEmployeeModalProps) {
  if (!employee) return null;

  const formatAddress = () => {
    const parts = [];
    if (employee.house_number) parts.push(employee.house_number);
    if (employee.block_number) parts.push(employee.block_number);
    if (employee.building_floor) parts.push(employee.building_floor);
    if (employee.residence) parts.push(employee.residence);
    if (employee.barangay) parts.push(employee.barangay);
    if (employee.city) parts.push(employee.city);
    if (employee.province) parts.push(employee.province);
    if (employee.region) parts.push(employee.region);
    return parts.join(", ") || "Not specified";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {employee.initials}
              </div>
              <div>
                <DialogTitle className="text-xl">{employee.full_name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {employee.position && employee.office
                    ? `${employee.position} - ${employee.office.abbreviation}`
                    : employee.position || employee.email}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={employee.is_active ? "default" : "secondary"}
              className={
                employee.is_active
                  ? "bg-green-500/10 text-green-700"
                  : "bg-gray-500/10 text-gray-600"
              }
            >
              {employee.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{employee.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Birthday</p>
                <p className="font-medium">
                  {employee.birthday
                    ? `${format(new Date(employee.birthday), "MMMM d, yyyy")} (${employee.age} years old)`
                    : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Civil Status</p>
                <p className="font-medium capitalize">{employee.civil_status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nationality</p>
                <p className="font-medium">{employee.nationality}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Employment Information */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <Briefcase className="h-4 w-4" />
              Employment Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Office</p>
                <p className="font-medium">
                  {employee.office
                    ? `${employee.office.name} (${employee.office.abbreviation})`
                    : "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Position</p>
                <p className="font-medium">{employee.position || "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Employed</p>
                <p className="font-medium">
                  {employee.date_employed
                    ? format(new Date(employee.date_employed), "MMMM d, yyyy")
                    : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Terminated</p>
                <p className="font-medium">
                  {employee.date_terminated
                    ? format(new Date(employee.date_terminated), "MMMM d, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              Address
            </h3>
            <p className="font-medium">{formatAddress()}</p>
          </div>

          <Separator />

          {/* Applications */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              Application Access ({employee.applications?.length || 0})
            </h3>
            {employee.applications && employee.applications.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {employee.applications.map((app) => (
                  <Badge key={app.uuid} variant="outline" className="capitalize">
                    {app.name} ({app.role.replace("_", " ")})
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No application access</p>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>Created: {format(new Date(employee.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            <p>Updated: {format(new Date(employee.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <Link href={`/employees/${employee.uuid}`} onClick={() => onOpenChange(false)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Employee
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
