export interface Application {
  uuid: string;
  name: string;
  description: string | null;
  client_id: string;
  redirect_uris: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApplicationData {
  name: string;
  description?: string;
  redirect_uris: string[];
  rate_limit_per_minute: number;
}

export interface ApplicationWithSecret extends Application {
  client_secret: string;
}

export interface RegenerateSecretResponse {
  client_secret: string;
}

export interface UpdateApplicationData {
  name?: string;
  description?: string;
  redirect_uris?: string[];
  rate_limit_per_minute?: number;
  is_active?: boolean;
}

export interface ApplicationEmployee {
  uuid: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  email: string;
  role: import("./employee").Role;
}

export interface EmployeeApplication {
  uuid: string;
  name: string;
  role: import("./employee").Role;
}
