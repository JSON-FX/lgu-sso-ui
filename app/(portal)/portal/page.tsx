"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { portalApi } from "@/lib/api";
import type { Employee } from "@/types/employee";
import type { UpdatePortalProfileData } from "@/types/portal";

interface FormData {
  email: string;
  birthday: string;
  civil_status: Employee["civil_status"];
  nationality: string;
  position: string;
  residence: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
}

const CIVIL_STATUS_OPTIONS: { value: Employee["civil_status"]; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "divorced", label: "Divorced" },
];

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
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      {value ? (
        <p className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    birthday: "",
    civil_status: "single",
    nationality: "",
    position: "",
    residence: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await portalApi.getProfile();
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleEdit() {
    if (!profile) return;
    setFormData({
      email: profile.email || "",
      birthday: profile.birthday || "",
      civil_status: profile.civil_status || "single",
      nationality: profile.nationality || "",
      position: profile.position || "",
      residence: profile.residence || "",
      region: profile.region || "",
      province: profile.province || "",
      city: profile.city || "",
      barangay: profile.barangay || "",
    });
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  async function handleSave() {
    if (!profile) return;

    setIsSaving(true);

    // Collect only changed fields
    const changes: UpdatePortalProfileData = {};

    if (formData.email !== (profile.email || "")) changes.email = formData.email;
    if (formData.birthday !== (profile.birthday || "")) changes.birthday = formData.birthday;
    if (formData.civil_status !== profile.civil_status) changes.civil_status = formData.civil_status;
    if (formData.nationality !== (profile.nationality || "")) changes.nationality = formData.nationality;
    if (formData.position !== (profile.position || "")) changes.position = formData.position;
    if (formData.residence !== (profile.residence || "")) changes.residence = formData.residence;
    if (formData.region !== (profile.region || "")) changes.region = formData.region;
    if (formData.province !== (profile.province || "")) changes.province = formData.province;
    if (formData.city !== (profile.city || "")) changes.city = formData.city;
    if (formData.barangay !== (profile.barangay || "")) changes.barangay = formData.barangay;

    // If nothing changed, just exit edit mode
    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      setIsSaving(false);
      return;
    }

    try {
      const updated = await portalApi.updateProfile(changes);
      setProfile(updated);
      setIsEditing(false);
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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          View and update your personal information
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name - always read-only */}
            <ProfileField label="First Name" value={profile?.first_name} />

            {/* Last Name - always read-only */}
            <ProfileField label="Last Name" value={profile?.last_name} />

            {/* Middle Name - always read-only */}
            <ProfileField label="Middle Name" value={profile?.middle_name} />

            {/* Username - always read-only, monospace */}
            <ProfileField label="Username" value={profile?.username} mono />

            {/* Email */}
            {isEditing ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
            ) : (
              <ProfileField label="Email" value={profile?.email} />
            )}

            {/* Birthday */}
            {isEditing ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Birthday
                </label>
                <Input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      birthday: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <ProfileField label="Birthday" value={profile?.birthday} />
            )}

            {/* Civil Status */}
            {isEditing ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Civil Status
                </label>
                <Select
                  value={formData.civil_status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      civil_status: value as Employee["civil_status"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select civil status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CIVIL_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <ProfileField
                label="Civil Status"
                value={
                  profile?.civil_status
                    ? profile.civil_status.charAt(0).toUpperCase() +
                      profile.civil_status.slice(1)
                    : null
                }
              />
            )}

            {/* Nationality */}
            {isEditing ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Nationality
                </label>
                <Input
                  value={formData.nationality}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nationality: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <ProfileField label="Nationality" value={profile?.nationality} />
            )}

            {/* Position */}
            {isEditing ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Position
                </label>
                <Input
                  value={formData.position}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <ProfileField label="Position" value={profile?.position} />
            )}

            {/* Office */}
            <ProfileField label="Office" value={profile?.office?.name} />
          </div>

          {/* Address Section */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Region */}
              {isEditing ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Region
                  </label>
                  <Input
                    value={formData.region}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        region: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <ProfileField label="Region" value={profile?.region} />
              )}

              {/* Province */}
              {isEditing ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Province
                  </label>
                  <Input
                    value={formData.province}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        province: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <ProfileField label="Province" value={profile?.province} />
              )}

              {/* City */}
              {isEditing ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    City
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <ProfileField label="City" value={profile?.city} />
              )}

              {/* Barangay */}
              {isEditing ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Barangay
                  </label>
                  <Input
                    value={formData.barangay}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        barangay: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <ProfileField label="Barangay" value={profile?.barangay} />
              )}

              {/* Residence */}
              {isEditing ? (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Residence
                  </label>
                  <Textarea
                    value={formData.residence}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        residence: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
              ) : (
                <ProfileField label="Residence" value={profile?.residence} />
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="gap-3">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
