/**
 * Office API Service
 *
 * Real API implementation for office management endpoints.
 */

import { apiClient } from "./client";
import { Office } from "@/types";

export const officeApi = {
  async list(): Promise<{ data: Office[] }> {
    return apiClient.get<{ data: Office[] }>("/offices");
  },

  async get(id: number): Promise<{ data: Office }> {
    return apiClient.get<{ data: Office }>(`/offices/${id}`);
  },
};
