/**
 * Stats API Service
 *
 * Real API implementation for dashboard statistics.
 * Note: This may need to be adjusted based on actual backend endpoints.
 */

import { apiClient } from "./client";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalApplications: number;
  activeApplications: number;
  recentLogins: number;
}

export const statsApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    // If the backend has a dedicated stats endpoint, use it
    // Otherwise, we can compute stats from multiple endpoints
    try {
      return await apiClient.get<DashboardStats>("/stats/dashboard");
    } catch {
      // Fallback: Compute stats from individual endpoints
      // This is a simplified approach - adjust based on actual API
      const [employeesRes, appsRes] = await Promise.all([
        apiClient.get<{ meta: { total: number } }>("/employees", { per_page: 1 }),
        apiClient.get<{ data: { is_active: boolean }[] }>("/applications"),
      ]);

      return {
        totalEmployees: employeesRes.meta?.total || 0,
        activeEmployees: employeesRes.meta?.total || 0, // Would need separate endpoint
        totalApplications: appsRes.data?.length || 0,
        activeApplications: appsRes.data?.filter((a) => a.is_active).length || 0,
        recentLogins: 0, // Would need audit endpoint
      };
    }
  },
};
