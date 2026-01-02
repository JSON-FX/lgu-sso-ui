"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

function isSuperAdmin(user: AuthUser): boolean {
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

      login: async (email: string, password: string) => {
        const response = await api.auth.login(email, password);

        // Set token in API layer to make authenticated requests
        api.auth.setToken(response.access_token);

        // Fetch full user data including applications from /auth/me
        const meResponse = await api.auth.me();
        const user = meResponse.data as AuthUser;
        const superAdmin = isSuperAdmin(user);

        if (!superAdmin) {
          await api.auth.logout();
          throw new Error("Access denied. Super administrator role required.");
        }

        set({
          user,
          token: response.access_token,
          isAuthenticated: true,
          isSuperAdmin: superAdmin,
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

          if (user && isSuperAdmin(user)) {
            set({
              user,
              isAuthenticated: true,
              isSuperAdmin: true,
              isLoading: false,
            });
          } else {
            await get().logout();
          }
        } catch {
          set({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: "lgu-sso-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
