export interface UpdatePortalProfileData {
  email?: string;
  birthday?: string;
  civil_status?: "single" | "married" | "widowed" | "separated" | "divorced";
  nationality?: string;
  suffix?: string;
  residence?: string;
  block_number?: string;
  building_floor?: string;
  house_number?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  position_id?: number;
  office_id?: number;
  date_employed?: string;
}
