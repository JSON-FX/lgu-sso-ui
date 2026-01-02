import { Employee } from "./employee";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  employee: Employee;
}

export interface AuthUser extends Employee {
  applications: {
    uuid: string;
    name: string;
    role: string;
  }[];
}

export interface MeResponse {
  data: AuthUser;
}
