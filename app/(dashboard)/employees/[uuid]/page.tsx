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
  ArrowLeft,
  Save,
  Trash2,
  Key,
  Mail,
  MapPin,
  User,
  Loader2,
  Briefcase,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { psgcApi, PSGCRegion, PSGCProvince, PSGCMunicipality, PSGCBarangay } from "@/lib/api/psgc";
import { Employee, Office, Position, UpdateEmployeeData } from "@/types";
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
  const [regions, setRegions] = useState<PSGCRegion[]>([]);
  const [provinces, setProvinces] = useState<PSGCProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCMunicipality[]>([]);
  const [barangays, setBarangays] = useState<PSGCBarangay[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionOpen, setPositionOpen] = useState(false);

  // Location form state - track codes for cascading and names for display/submit
  const [regionCode, setRegionCode] = useState<string>("");
  const [provinceCode, setProvinceCode] = useState<string>("");
  const [municipalityCode, setMunicipalityCode] = useState<string>("");
  const [regionName, setRegionName] = useState<string>("");
  const [provinceName, setProvinceName] = useState<string>("");
  const [cityName, setCityName] = useState<string>("");
  const [barangayName, setBarangayName] = useState<string>("");

  // Combobox open states
  const [regionOpen, setRegionOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [barangayOpen, setBarangayOpen] = useState(false);
  const [officeOpen, setOfficeOpen] = useState(false);

  useEffect(() => {
    async function loadEmployee() {
      try {
        const [employeeRes, regionsData] = await Promise.all([
          api.employees.get(uuid),
          psgcApi.getRegions(),
        ]);

        // Offices API is optional - may not exist in backend yet
        let officesData: Office[] = [];
        try {
          const officesRes = await api.offices.list();
          officesData = officesRes.data;
        } catch {
          // Offices endpoint not available, continue without it
        }

        let positionsData: Position[] = [];
        try {
          const positionsRes = await api.positions.list();
          positionsData = positionsRes.data;
        } catch {
          // Positions endpoint not available
        }

        setEmployee(employeeRes.data);
        setRegions(regionsData);
        setOffices(officesData);
        setPositions(positionsData);

        setFormData({
          first_name: employeeRes.data.first_name,
          middle_name: employeeRes.data.middle_name || "",
          last_name: employeeRes.data.last_name,
          suffix: employeeRes.data.suffix || "",
          email: employeeRes.data.email,
          birthday: employeeRes.data.birthday,
          civil_status: employeeRes.data.civil_status,
          nationality: employeeRes.data.nationality,
          house_number: employeeRes.data.house_number || "",
          block_number: employeeRes.data.block_number || "",
          building_floor: employeeRes.data.building_floor || "",
          residence: employeeRes.data.residence,
          is_active: employeeRes.data.is_active,
          office_id: employeeRes.data.office?.id,
          position_id: employeeRes.data.position?.id || undefined,
          date_employed: employeeRes.data.date_employed || "",
          date_terminated: employeeRes.data.date_terminated || "",
        });

        // Populate location names from employee data (stored as strings)
        setRegionName(employeeRes.data.region || "");
        setProvinceName(employeeRes.data.province || "");
        setCityName(employeeRes.data.city || "");
        setBarangayName(employeeRes.data.barangay || "");
      } catch (error) {
        console.error("Failed to load employee:", error);
        toast.error("Failed to load employee details");
      } finally {
        setIsLoading(false);
      }
    }

    loadEmployee();
  }, [uuid]);

  const handleRegionChange = async (code: string, name: string) => {
    setRegionCode(code);
    setRegionName(name);
    setProvinceCode("");
    setProvinceName("");
    setMunicipalityCode("");
    setCityName("");
    setBarangayName("");
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
    setProvinceCode(code);
    setProvinceName(name);
    setMunicipalityCode("");
    setCityName("");
    setBarangayName("");
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
    setMunicipalityCode(code);
    setCityName(name);
    setBarangayName("");
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert empty strings to null for optional fields
      const updateData = {
        ...formData,
        region: regionName || null,
        province: provinceName || null,
        city: cityName || null,
        barangay: barangayName || null,
        middle_name: formData.middle_name || null,
        suffix: formData.suffix || null,
        house_number: formData.house_number || null,
        block_number: formData.block_number || null,
        building_floor: formData.building_floor || null,
        office_id: formData.office_id || null,
        position_id: formData.position_id || null,
        date_employed: formData.date_employed || null,
        date_terminated: formData.date_terminated || null,
      };
      const response = await api.employees.update(uuid, updateData as UpdateEmployeeData);
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
      await api.employees.delete(uuid);
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
                {employee.position?.title && employee.office
                  ? `${employee.position.title} - ${employee.office.abbreviation}`
                  : employee.position?.title || employee.email}
              </p>
              {(employee.position?.title || employee.office) && (
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
                <Popover open={officeOpen} onOpenChange={setOfficeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={officeOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.office_id
                        ? (() => { const o = offices.find((o) => o.id === formData.office_id); return o ? `${o.abbreviation} - ${o.name}` : "Select office"; })()
                        : "Select office"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                      <CommandInput placeholder="Search office..." />
                      <CommandList>
                        <CommandEmpty>No office found.</CommandEmpty>
                        <CommandGroup>
                          {offices.map((o) => (
                            <CommandItem
                              key={o.id}
                              value={`${o.abbreviation} - ${o.name}`}
                              onSelect={() => {
                                setFormData({ ...formData, office_id: o.id });
                                setOfficeOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.office_id === o.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {o.abbreviation} - {o.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={positionOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.position_id
                        ? positions.find((p) => p.id === formData.position_id)?.title
                        : "Select position"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search position..." />
                      <CommandList>
                        <CommandEmpty>No position found.</CommandEmpty>
                        <CommandGroup>
                          {positions.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.title}
                              onSelect={() => {
                                setFormData({ ...formData, position_id: p.id });
                                setPositionOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.position_id === p.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {p.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                      {regionName || "Select region"}
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
                                  regionCode === r.code ? "opacity-100" : "opacity-0"
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
                      disabled={!regionCode}
                    >
                      {provinceName || "Select province"}
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
                                  provinceCode === p.code ? "opacity-100" : "opacity-0"
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

              {/* Municipality */}
              <div className="space-y-2">
                <Label>City/Municipality</Label>
                <Popover open={municipalityOpen} onOpenChange={setMunicipalityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={municipalityOpen}
                      className="w-full justify-between font-normal"
                      disabled={!provinceCode}
                    >
                      {cityName || "Select city/municipality"}
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
                                  municipalityCode === m.code ? "opacity-100" : "opacity-0"
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
                      disabled={!municipalityCode}
                    >
                      {barangayName || "Select barangay"}
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
                                setBarangayName(b.name);
                                setBarangayOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  barangayName === b.name ? "opacity-100" : "opacity-0"
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
                  value={formData.house_number || ""}
                  onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                  placeholder="e.g., 123"
                />
              </div>

              {/* Block Number */}
              <div className="space-y-2">
                <Label htmlFor="block_number">Block Number</Label>
                <Input
                  id="block_number"
                  value={formData.block_number || ""}
                  onChange={(e) => setFormData({ ...formData, block_number: e.target.value })}
                  placeholder="e.g., Block 5"
                />
              </div>

              {/* Building/Floor */}
              <div className="space-y-2">
                <Label htmlFor="building_floor">Building/Floor</Label>
                <Input
                  id="building_floor"
                  value={formData.building_floor || ""}
                  onChange={(e) => setFormData({ ...formData, building_floor: e.target.value })}
                  placeholder="e.g., 3rd Floor, Unit 201"
                />
              </div>

              {/* Street Address */}
              <div className="space-y-2 md:col-span-2">
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
