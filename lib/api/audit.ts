/**
 * Audit API Service
 *
 * Real API implementation for audit log endpoints.
 */

import { apiClient } from "./client";
import { AuditLog, AuditLogFilters, PaginatedResponse } from "@/types";

export const auditApi = {
  async list(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    const params: Record<string, string | number | undefined> = {};

    if (filters.action) params.action = filters.action;
    if (filters.employee_uuid) params.employee_uuid = filters.employee_uuid;
    if (filters.application_uuid) params.application_uuid = filters.application_uuid;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    return apiClient.get<PaginatedResponse<AuditLog>>("/audit/logs", params);
  },
};
