export type Role = "ADMIN" | "MANAGER" | "SELLER" | "WAREHOUSE" | "VIEWER";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: Role;
  role_display: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}
