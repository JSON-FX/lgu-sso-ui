"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser, RegisterData, RegisterResponse } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  sessionPassword: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

function checkIsSuperAdmin(user: AuthUser): boolean {
  return user.applications?.some((app) => app.role === "super_administrator") ?? false;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      isSuperAdmin: false,
      mustChangePassword: false,
      sessionPassword: null,

      login: async (username: string, password: string) => {
        const response = await api.auth.login({ username, password });

        // Set token in API layer to make authenticated requests
        api.auth.setToken(response.access_token);

        // Fetch full user data including applications from /auth/me
        const meResponse = await api.auth.me();
        const user = meResponse.data as AuthUser;
        const isSuperAdmin = checkIsSuperAdmin(user);

        set({
          user,
          token: response.access_token,
          isAuthenticated: true,
          isSuperAdmin,
          mustChangePassword: user.must_change_password,
          sessionPassword: password,
          isLoading: false,
        });
      },

      logout: async () => {
        try {
          await api.auth.logout();
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isSuperAdmin: false,
            mustChangePassword: false,
            sessionPassword: null,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        const { token } = get();

        if (!token) {
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        try {
          // Restore token in API layer
          api.auth.setToken(token);
          const response = await api.auth.me();
          const user = response.data;

          set({
            user,
            isAuthenticated: true,
            isSuperAdmin: checkIsSuperAdmin(user),
            mustChangePassword: user.must_change_password,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      },

      register: async (data: RegisterData): Promise<RegisterResponse> => {
        return api.auth.register(data);
      },

      changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await api.auth.changePassword({ current_password: currentPassword, new_password: newPassword });
        set({ mustChangePassword: false, sessionPassword: null });
      },
    }),
    {
      name: "lgu-sso-auth",
      partialize: (state) => ({ token: state.token, user: state.user, sessionPassword: state.sessionPassword }),
    }
  )
);
