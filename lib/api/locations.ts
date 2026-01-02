/**
 * Location API Service
 *
 * Real API implementation for Philippine location (PSGC) endpoints.
 */

import { apiClient } from "./client";
import { Location } from "@/types";

export const locationApi = {
  async getProvinces(): Promise<{ data: Location[] }> {
    return apiClient.get<{ data: Location[] }>("/locations/provinces");
  },

  async getCities(provinceCode: string): Promise<{ data: Location[] }> {
    return apiClient.get<{ data: Location[] }>(`/locations/provinces/${provinceCode}/cities`);
  },

  async getBarangays(cityCode: string): Promise<{ data: Location[] }> {
    return apiClient.get<{ data: Location[] }>(`/locations/cities/${cityCode}/barangays`);
  },
};
