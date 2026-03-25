export interface UpdatePortalProfileData {
  email?: string;
  birthday?: string;
  civil_status?: "single" | "married" | "widowed" | "separated" | "divorced";
  nationality?: string;
  residence?: string;
  block_number?: string;
  building_floor?: string;
  house_number?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  position?: string;
}
