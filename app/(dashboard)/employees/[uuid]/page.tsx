"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Save,
  Trash2,
  Key,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Loader2,
  Briefcase,
  Building2,
} from "lucide-react";
import { mockEmployeeApi, mockLocationApi, mockOfficeApi } from "@/lib/mock";
import { Employee, Location, Office, UpdateEmployeeData } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params.uuid as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpdateEmployeeData>({});
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    async function loadEmployee() {
      try {
        const [employeeRes, provincesRes, officesRes] = await Promise.all([
          mockEmployeeApi.get(uuid),
          mockLocationApi.getProvinces(),
          mockOfficeApi.list(),
        ]);

        setEmployee(employeeRes.data);
        setProvinces(provincesRes.data);
        setOffices(officesRes.data);

        setFormData({
          first_name: employeeRes.data.first_name,
          middle_name: employeeRes.data.middle_name || "",
          last_name: employeeRes.data.last_name,
          suffix: employeeRes.data.suffix || "",
          email: employeeRes.data.email,
          birthday: employeeRes.data.birthday,
          civil_status: employeeRes.data.civil_status,
          nationality: employeeRes.data.nationality,
          residence: employeeRes.data.residence,
          is_active: employeeRes.data.is_active,
          office_id: employeeRes.data.office?.id,
          position: employeeRes.data.position || "",
          date_employed: employeeRes.data.date_employed || "",
          date_terminated: employeeRes.data.date_terminated || "",
        });

        if (employeeRes.data.province?.code) {
          const citiesData = await mockLocationApi.getCities(employeeRes.data.province.code);
          setCities(citiesData.data);
        }

        if (employeeRes.data.city?.code) {
          const barangaysData = await mockLocationApi.getBarangays(employeeRes.data.city.code);
          setBarangays(barangaysData.data);
        }
      } catch (error) {
        console.error("Failed to load employee:", error);
        toast.error("Failed to load employee details");
      } finally {
        setIsLoading(false);
      }
    }

    loadEmployee();
  }, [uuid]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await mockEmployeeApi.update(uuid, formData);
      setEmployee(response.data);
      toast.success("Employee updated successfully");
    } catch (error) {
      toast.error("Failed to update employee");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mockEmployeeApi.delete(uuid);
      toast.success("Employee deleted successfully");
      router.push("/employees");
    } catch (error) {
      toast.error("Failed to delete employee");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
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
        <Skeleton className="h-[500px] w-full" />
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
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {employee.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{employee.full_name}</h1>
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
              <p className="text-muted-foreground">
                {employee.position && employee.office
                  ? `${employee.position} - ${employee.office.abbreviation}`
                  : employee.position || employee.email}
              </p>
              {(employee.position || employee.office) && (
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/employees/${uuid}/applications`}>
              <Key className="mr-2 h-4 w-4" />
              Manage Access
            </Link>
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Employee</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {employee.full_name}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="applications">Applications ({employee.applications?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
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
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name || ""}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  value={formData.middle_name || ""}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ""}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Input
                  id="suffix"
                  value={formData.suffix || ""}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  placeholder="Jr., Sr., III, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday || ""}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="civil_status">Civil Status</Label>
                <Select
                  value={formData.civil_status}
                  onValueChange={(value) => setFormData({ ...formData, civil_status: value as Employee["civil_status"] })}
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
                  value={formData.nationality || ""}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
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
              <div className="space-y-2">
                <Label>Office</Label>
                <Select
                  value={formData.office_id?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, office_id: value ? parseInt(value) : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((o) => (
                      <SelectItem key={o.id} value={o.id.toString()}>
                        {o.name} ({o.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., Budget Analyst, Administrative Clerk"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_employed">Date Employed</Label>
                <Input
                  id="date_employed"
                  type="date"
                  value={formData.date_employed || ""}
                  onChange={(e) => setFormData({ ...formData, date_employed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_terminated">Date Terminated</Label>
                <Input
                  id="date_terminated"
                  type="date"
                  value={formData.date_terminated || ""}
                  onChange={(e) => setFormData({ ...formData, date_terminated: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Province</Label>
                <Select value={employee.province?.code || ""} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City/Municipality</Label>
                <Select value={employee.city?.code || ""} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Select value={employee.barangay?.code || ""} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {barangays.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="residence">Street Address</Label>
                <Textarea
                  id="residence"
                  value={formData.residence || ""}
                  onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Application Access</CardTitle>
                <CardDescription>
                  Applications this employee can access
                </CardDescription>
              </div>
              <Button asChild>
                <Link href={`/employees/${uuid}/applications`}>
                  Manage Access
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {employee.applications && employee.applications.length > 0 ? (
                <div className="space-y-3">
                  {employee.applications.map((app) => (
                    <div
                      key={app.uuid}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-sm text-muted-foreground">UUID: {app.uuid}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {app.role.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  This employee doesn&apos;t have access to any applications yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
