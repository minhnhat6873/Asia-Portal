export const ACCOUNT_ROLES = ["admin", "manager", "user"] as const;
export const ACCOUNT_STATUSES = ["pending", "active", "inactive"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface Account {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  status: AccountStatus;
  permissionGroupIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedAccount {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  permissions: import("./permission-group.interface").PermissionAction[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterAccountInput {
  name: string;
  email: string;
  password: string;
}

export interface CreateAdminAccountInput extends RegisterAccountInput {
  role: Exclude<AccountRole, "admin">;
  permissionGroupIds?: string[];
}

export interface UpdateAdminAccountInput {
  name?: string;
  role?: AccountRole;
  status?: AccountStatus;
  permissionGroupIds?: string[];
}

export interface ResetAccountPasswordInput {
  password: string;
}

export interface AccountResponse {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  permissionGroupIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
