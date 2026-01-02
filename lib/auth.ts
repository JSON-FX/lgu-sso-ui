import { api, setAuthToken, removeAuthToken } from "./api";
import { LoginCredentials, LoginResponse, MeResponse, AuthUser } from "@/types";

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await api.post<LoginResponse>("/auth/login", credentials);
  setAuthToken(response.access_token);

  // Fetch full user data including applications
  const meResponse = await api.get<MeResponse>("/auth/me");
  return meResponse.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    removeAuthToken();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await api.get<MeResponse>("/auth/me");
    return response.data;
  } catch {
    removeAuthToken();
    return null;
  }
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.applications.some((app) => app.role === "super_administrator");
}
