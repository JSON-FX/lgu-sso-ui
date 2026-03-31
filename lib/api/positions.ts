/**
 * Position API Service
 *
 * Real API implementation for position management endpoints.
 */

import { apiClient } from "./client";
import { Position } from "@/types";

export const positionApi = {
  async list(): Promise<{ data: Position[] }> {
    return apiClient.get<{ data: Position[] }>("/positions");
  },
};
