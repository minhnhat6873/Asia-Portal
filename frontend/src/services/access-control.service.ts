import { apiGet, apiPatch, apiPost } from "./api";

export type ApiAccountRole = "admin" | "manager" | "user";
export type ApiAccountStatus = "pending" | "active" | "inactive";
export type PermissionAction =
  | "dashboard:view"
  | "employees:view"
  | "employees:create"
  | "employees:update"
  | "employees:deactivate"
  | "employees:delete";

export interface ApiAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: ApiAccountRole;
  status: ApiAccountStatus;
  permissionGroupIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiPermissionGroup {
  id: string;
  name: string;
  actions: PermissionAction[];
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

export const getAccounts = (): Promise<ApiAccount[]> => apiGet<ApiAccount[]>("/admin/accounts");

export function createAccount(input: { name: string; email: string; password: string; role: "manager" | "user"; permissionGroupIds?: string[] }): Promise<ApiAccount> {
  return apiPost<ApiAccount>("/admin/accounts", input);
}

export function updateAccount(id: string, input: Partial<Pick<ApiAccount, "name" | "role" | "status" | "permissionGroupIds">>): Promise<ApiAccount> {
  return apiPatch<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}`, input);
}

export const getPermissionGroups = (): Promise<ApiPermissionGroup[]> => apiGet<ApiPermissionGroup[]>("/admin/permission-groups");

export function createPermissionGroup(input: { name: string; actions: PermissionAction[] }): Promise<ApiPermissionGroup> {
  return apiPost<ApiPermissionGroup>("/admin/permission-groups", input);
}

export function updatePermissionGroup(id: string, input: Partial<Pick<ApiPermissionGroup, "name" | "actions" | "status">>): Promise<ApiPermissionGroup> {
  return apiPatch<ApiPermissionGroup>(`/admin/permission-groups/${encodeURIComponent(id)}`, input);
}
