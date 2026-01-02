"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, UserPlus, User, Mail, MapPin, Lock, Building2, Briefcase } from "lucide-react";
import { mockEmployeeApi, mockLocationApi, mockOfficeApi } from "@/lib/mock";
import { CreateEmployeeData, Location, Office } from "@/types";
import { toast } from "sonner";

export default function NewEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [barangays, setBarangays] = useState<Location[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  const [formData, setFormData] = useState<CreateEmployeeData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    password: "",
    birthday: "",
    civil_status: "single",
    nationality: "Filipino",
    province_code: "",
    city_code: "",
    barangay_code: "",
    residence: "",
    office_id: undefined,
    position: "",
    date_employed: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      const [provincesRes, officesRes] = await Promise.all([
        mockLocationApi.getProvinces(),
        mockOfficeApi.list(),
      ]);
      setProvinces(provincesRes.data);
      setOffices(officesRes.data);
    }
    loadData();
  }, []);

  const handleProvinceChange = async (code: string) => {
    setFormData({ ...formData, province_code: code, city_code: "", barangay_code: "" });
    setCities([]);
    setBarangays([]);

    if (code) {
      const response = await mockLocationApi.getCities(code);
      setCities(response.data);
    }
  };

  const handleCityChange = async (code: string) => {
    setFormData({ ...formData, city_code: code, barangay_code: "" });
    setBarangays([]);

    if (code) {
      const response = await mockLocationApi.getBarangays(code);
      setBarangays(response.data);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name || formData.first_name.length < 2) {
      newErrors.first_name = "First name must be at least 2 characters";
    }
    if (!formData.last_name || formData.last_name.length < 2) {
      newErrors.last_name = "Last name must be at least 2 characters";
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    }
    if (!formData.position) {
      newErrors.position = "Position is required";
    }
    if (!formData.residence) {
      newErrors.residence = "Street address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await mockEmployeeApi.create(formData);
      toast.success("Employee created successfully");
      router.push(`/employees/${response.data.uuid}`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create employee");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Employee</h1>
          <p className="text-muted-foreground">Create a new employee account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label htmlFor="first_name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                placeholder="Jr., Sr., III, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">
                Birthday <span className="text-destructive">*</span>
              </Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className={errors.birthday ? "border-destructive" : ""}
              />
              {errors.birthday && (
                <p className="text-xs text-destructive">{errors.birthday}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="civil_status">
                Civil Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.civil_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, civil_status: value as CreateEmployeeData["civil_status"] })
                }
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
              <Label htmlFor="nationality">
                Nationality <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Account Credentials
            </CardTitle>
            <CardDescription>Login credentials for the employee</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? "border-destructive" : ""}
                placeholder="employee@lgu.gov.ph"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={errors.password ? "border-destructive" : ""}
                placeholder="Minimum 8 characters"
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
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
              <Label htmlFor="position">
                Position <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className={errors.position ? "border-destructive" : ""}
                placeholder="e.g., Budget Analyst, Administrative Clerk"
              />
              {errors.position && <p className="text-xs text-destructive">{errors.position}</p>}
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
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>Employee&apos;s residential address</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Province</Label>
              <Select value={formData.province_code || ""} onValueChange={handleProvinceChange}>
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
              <Select
                value={formData.city_code || ""}
                onValueChange={handleCityChange}
                disabled={!formData.province_code}
              >
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
              <Select
                value={formData.barangay_code || ""}
                onValueChange={(code) => setFormData({ ...formData, barangay_code: code })}
                disabled={!formData.city_code}
              >
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
              <Label htmlFor="residence">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="residence"
                value={formData.residence}
                onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                className={errors.residence ? "border-destructive" : ""}
                rows={2}
                placeholder="House number, street name, building, etc."
              />
              {errors.residence && <p className="text-xs text-destructive">{errors.residence}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
