"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Save, X, Check, ChevronsUpDown, User, Lock, Briefcase, MapPin, Info } from "lucide-react";
import { toast } from "sonner";
import { portalApi, api } from "@/lib/api";
import { psgcApi, PSGCRegion, PSGCProvince, PSGCMunicipality, PSGCBarangay } from "@/lib/api/psgc";
import type { Employee, Office, Position } from "@/types/employee";
import type { UpdatePortalProfileData } from "@/types/portal";

interface FormData {
  email: string;
  birthday: string;
  civil_status: Employee["civil_status"];
  nationality: string;
  suffix: string;
  position_id: number | undefined;
  office_id: number | undefined;
  date_employed: string;
  residence: string;
  house_number: string;
  block_number: string;
  building_floor: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
}

function ProfileField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <p className={`text-sm pt-1 ${mono ? "font-mono" : ""}`}>{value}</p>
      ) : (
        <p className="text-sm pt-1 text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    birthday: "",
    civil_status: "single",
    nationality: "",
    suffix: "",
    position_id: undefined,
    office_id: undefined,
    date_employed: "",
    residence: "",
    house_number: "",
    block_number: "",
    building_floor: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
  });

  // PSGC lists
  const [regions, setRegions] = useState<PSGCRegion[]>([]);
  const [provinces, setProvinces] = useState<PSGCProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCMunicipality[]>([]);
  const [barangays, setBarangays] = useState<PSGCBarangay[]>([]);

  // Selected codes for cascading
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");

  // Offices
  const [offices, setOffices] = useState<Office[]>([]);

  // Positions
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionOpen, setPositionOpen] = useState(false);

  // Popover open states
  const [regionOpen, setRegionOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [barangayOpen, setBarangayOpen] = useState(false);
  const [officeOpen, setOfficeOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await portalApi.getProfile();
        setProfile(data);
        setFormData({
          email: data.email || "",
          birthday: data.birthday || "",
          civil_status: data.civil_status || "single",
          nationality: data.nationality || "",
          suffix: data.suffix || "",
          position_id: data.position?.id || undefined,
          office_id: data.office?.id || undefined,
          date_employed: data.date_employed || "",
          residence: data.residence || "",
          house_number: data.house_number || "",
          block_number: data.block_number || "",
          building_floor: data.building_floor || "",
          region: data.region || "",
          province: data.province || "",
          city: data.city || "",
          barangay: data.barangay || "",
        });
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
    psgcApi.getRegions().then(setRegions).catch(console.error);
    api.offices.list().then((res) => setOffices(res.data)).catch(() => {});
    api.positions.list().then((res) => setPositions(res.data)).catch(() => {});
  }, []);

  const handleRegionChange = async (code: string, name: string) => {
    setSelectedRegionCode(code);
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setFormData((prev) => ({ ...prev, region: name, province: "", city: "", barangay: "" }));
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
    setSelectedProvinceCode(code);
    setSelectedCityCode("");
    setFormData((prev) => ({ ...prev, province: name, city: "", barangay: "" }));
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
    setSelectedCityCode(code);
    setFormData((prev) => ({ ...prev, city: name, barangay: "" }));
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

  function handleCancel() {
    if (!profile) return;
    setFormData({
      email: profile.email || "",
      birthday: profile.birthday || "",
      civil_status: profile.civil_status || "single",
      nationality: profile.nationality || "",
      suffix: profile.suffix || "",
      position_id: profile.position?.id || undefined,
      office_id: profile.office?.id || undefined,
      date_employed: profile.date_employed || "",
      residence: profile.residence || "",
      house_number: profile.house_number || "",
      block_number: profile.block_number || "",
      building_floor: profile.building_floor || "",
      region: profile.region || "",
      province: profile.province || "",
      city: profile.city || "",
      barangay: profile.barangay || "",
    });
    setSelectedRegionCode("");
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);
  }

  async function handleSave() {
    if (!profile) return;

    setIsSaving(true);

    const changes: UpdatePortalProfileData = {};

    if (formData.email !== (profile.email || "")) changes.email = formData.email;
    if (formData.birthday !== (profile.birthday || "")) changes.birthday = formData.birthday;
    if (formData.civil_status !== profile.civil_status) changes.civil_status = formData.civil_status;
    if (formData.nationality !== (profile.nationality || "")) changes.nationality = formData.nationality;
    if (formData.suffix !== (profile.suffix || "")) changes.suffix = formData.suffix;
    if (formData.position_id !== (profile.position?.id || undefined)) changes.position_id = formData.position_id;
    if (formData.office_id !== (profile.office?.id || undefined)) changes.office_id = formData.office_id;
    if (formData.date_employed !== (profile.date_employed || "")) changes.date_employed = formData.date_employed;
    if (formData.residence !== (profile.residence || "")) changes.residence = formData.residence;
    if (formData.house_number !== (profile.house_number || "")) changes.house_number = formData.house_number;
    if (formData.block_number !== (profile.block_number || "")) changes.block_number = formData.block_number;
    if (formData.building_floor !== (profile.building_floor || "")) changes.building_floor = formData.building_floor;
    if (formData.region !== (profile.region || "")) changes.region = formData.region;
    if (formData.province !== (profile.province || "")) changes.province = formData.province;
    if (formData.city !== (profile.city || "")) changes.city = formData.city;
    if (formData.barangay !== (profile.barangay || "")) changes.barangay = formData.barangay;

    if (Object.keys(changes).length === 0) {
      setIsSaving(false);
      toast.info("No changes to save");
      return;
    }

    try {
      const updated = await portalApi.updateProfile(changes);
      setProfile(updated);
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and update your personal information</p>
      </div>

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
          <ProfileField label="First Name" value={profile?.first_name} />
          <ProfileField label="Middle Name" value={profile?.middle_name} />
          <ProfileField label="Last Name" value={profile?.last_name} />
          <div className="space-y-2">
            <Label htmlFor="suffix">Suffix</Label>
            <Input
              id="suffix"
              value={formData.suffix}
              onChange={(e) => setFormData((prev) => ({ ...prev, suffix: e.target.value }))}
              placeholder="Jr., Sr., III, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData((prev) => ({ ...prev, birthday: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="civil_status">Civil Status</Label>
            <Select
              value={formData.civil_status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, civil_status: value as Employee["civil_status"] }))
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
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              onChange={(e) => setFormData((prev) => ({ ...prev, nationality: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Credentials */}
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
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="employee@lgu.gov.ph"
            />
          </div>
          <ProfileField label="Username" value={profile?.username} mono />
          <div className="md:col-span-2">
            <div className="bg-muted/50 border rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Username and default password are managed by administrators.
              </p>
            </div>
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
                <Command>
                  <CommandInput placeholder="Search office..." />
                  <CommandList>
                    <CommandEmpty>No office found.</CommandEmpty>
                    <CommandGroup>
                      {offices.map((o) => (
                        <CommandItem
                          key={o.id}
                          value={`${o.abbreviation} - ${o.name}`}
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, office_id: o.id }));
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
                            setFormData((prev) => ({ ...prev, position_id: p.id }));
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
              value={formData.date_employed}
              onChange={(e) => setFormData((prev) => ({ ...prev, date_employed: e.target.value }))}
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
                  {formData.region || "Select region"}
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
                              selectedRegionCode === r.code ? "opacity-100" : "opacity-0"
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
                  disabled={!selectedRegionCode}
                >
                  {formData.province || "Select province"}
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
                              selectedProvinceCode === p.code ? "opacity-100" : "opacity-0"
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

          {/* City/Municipality */}
          <div className="space-y-2">
            <Label>City/Municipality</Label>
            <Popover open={municipalityOpen} onOpenChange={setMunicipalityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={municipalityOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedProvinceCode}
                >
                  {formData.city || "Select city/municipality"}
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
                              selectedCityCode === m.code ? "opacity-100" : "opacity-0"
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
                  disabled={!selectedCityCode}
                >
                  {formData.barangay || "Select barangay"}
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
                            setFormData((prev) => ({ ...prev, barangay: b.name }));
                            setBarangayOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              formData.barangay === b.name ? "opacity-100" : "opacity-0"
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
              value={formData.house_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, house_number: e.target.value }))}
              placeholder="e.g., 123"
            />
          </div>

          {/* Block Number */}
          <div className="space-y-2">
            <Label htmlFor="block_number">Block Number</Label>
            <Input
              id="block_number"
              value={formData.block_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, block_number: e.target.value }))}
              placeholder="e.g., Block 5"
            />
          </div>

          {/* Building/Floor */}
          <div className="space-y-2">
            <Label htmlFor="building_floor">Building/Floor</Label>
            <Input
              id="building_floor"
              value={formData.building_floor}
              onChange={(e) => setFormData((prev) => ({ ...prev, building_floor: e.target.value }))}
              placeholder="e.g., 3rd Floor, Unit 201"
            />
          </div>

          {/* Street Address */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="residence">Street Address</Label>
            <Textarea
              id="residence"
              value={formData.residence}
              onChange={(e) => setFormData((prev) => ({ ...prev, residence: e.target.value }))}
              rows={2}
              placeholder="Street name, subdivision, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Save/Cancel */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
