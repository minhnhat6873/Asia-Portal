export const ADMIN_ROLES = ["admin", "manager"] as const;
export const ADMIN_STATUSES = ["active", "inactive"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export interface AdminAccount {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface LoginInput {
  email: string;
  password: string;
}