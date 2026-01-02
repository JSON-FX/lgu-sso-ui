"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser } from "@/types";
import { mockAuthApi } from "@/lib/mock";

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
        const response = await mockAuthApi.login(email, password);
        const user = response.employee as AuthUser;
        const superAdmin = isSuperAdmin(user);

        if (!superAdmin) {
          await mockAuthApi.logout();
          throw new Error("Access denied. Super administrator role required.");
        }

        // Set token in mock API
        mockAuthApi.setToken(response.access_token);

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
          await mockAuthApi.logout();
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
          // Restore token in mock API
          mockAuthApi.setToken(token);
          const response = await mockAuthApi.me();
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
