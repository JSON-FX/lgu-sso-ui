/**
 * PSGC (Philippine Standard Geographic Code) API Service
 *
 * Uses the psgc.cloud API for Philippine location data.
 * API Documentation: https://psgc.cloud/api-docs
 */

const PSGC_API_BASE = "https://psgc.cloud/api";

export interface PSGCRegion {
  code: string;
  name: string;
}

export interface PSGCProvince {
  code: string;
  name: string;
}

export interface PSGCMunicipality {
  code: string;
  name: string;
  type: string; // "Mun" or "City"
  zip_code: string;
  district: string;
}

export interface PSGCBarangay {
  code: string;
  name: string;
  status: string;
}

async function fetchPSGC<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${PSGC_API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`PSGC API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const psgcApi = {
  async getRegions(): Promise<PSGCRegion[]> {
    return fetchPSGC<PSGCRegion[]>("/regions");
  },

  async getProvinces(regionCode: string): Promise<PSGCProvince[]> {
    return fetchPSGC<PSGCProvince[]>(`/regions/${regionCode}/provinces`);
  },

  async getMunicipalities(provinceCode: string): Promise<PSGCMunicipality[]> {
    return fetchPSGC<PSGCMunicipality[]>(`/provinces/${provinceCode}/cities-municipalities`);
  },

  async getBarangays(municipalityCode: string): Promise<PSGCBarangay[]> {
    return fetchPSGC<PSGCBarangay[]>(`/cities-municipalities/${municipalityCode}/barangays`);
  },
};
