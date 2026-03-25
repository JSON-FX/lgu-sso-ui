import { apiClient } from "./client"

export const ssoApi = {
  validateRedirect: async (data: { client_id: string; redirect_uri: string }): Promise<{ valid: boolean; application: { name: string; description: string } }> => {
    return apiClient.post("/sso/validate-redirect", data)
  },

  sessionCheck: async (): Promise<{ authenticated: boolean; token?: string }> => {
    return apiClient.get("/sso/session-check")
  },
}
