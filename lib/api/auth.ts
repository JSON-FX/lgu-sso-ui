/**
 * Auth API Service
 *
 * Real API implementation for authentication endpoints.
 */

import { apiClient, setAuthToken, removeAuthToken, hasAuthToken } from "./client";
import { AuthUser, LoginResponse, MessageResponse } from "@/types";
import { RegisterData, RegisterResponse, ChangePasswordData } from "@/types/auth";

export const authApi = {
  async login({ username, password }: { username: string; password: string }): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/login", {
      username,
      password,
    });

    // Store the token
    if (response.access_token) {
      setAuthToken(response.access_token);
    }

    return response;
  },

  async logout(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>("/auth/logout");
    removeAuthToken();
    return response;
  },

  async logoutAll(): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>("/auth/logout-all");
    removeAuthToken();
    return response;
  },

  async me(): Promise<{ data: AuthUser }> {
    return apiClient.get<{ data: AuthUser }>("/auth/me");
  },

  async refresh(): Promise<{ access_token: string; token_type: string }> {
    const response = await apiClient.post<{ access_token: string; token_type: string }>(
      "/auth/refresh"
    );

    if (response.access_token) {
      setAuthToken(response.access_token);
    }

    return response;
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>("/auth/register", data);
  },

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/auth/change-password", data);
  },

  // Helper methods for token management
  setToken(token: string | null) {
    if (token) {
      setAuthToken(token);
    } else {
      removeAuthToken();
    }
  },

  hasToken() {
    return hasAuthToken();
  },
};
