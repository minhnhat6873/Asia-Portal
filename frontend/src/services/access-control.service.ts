import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type { ModuleCategory, SystemPermission } from "@/features/access-control/types";
import type { GroupColor, GroupIcon } from "@/features/access-control/permission-group-appearance";

export type ApiAccountRole = "admin" | "manager" | "user";
export type ApiAccountStatus = "pending" | "active" | "inactive";
export type PermissionAction =
  | "dashboard:view"
  | "employees:view"
  | "employees:view-birth-date"
  | "employees:create"
  | "employees:update"
  | "employees:delete"
  | "employees:trash"
  | "media:view" | "media:create" | "media:update" | "media:publish" | "media:delete" | "media:trash"
  | "meetings:view" | "meetings:create" | "meetings:update" | "meetings:delete";

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
  description: string;
  color?: GroupColor;
  icon?: GroupIcon;
  actions: PermissionAction[];
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

export const getAccounts = (): Promise<ApiAccount[]> => apiGet<ApiAccount[]>("/admin/accounts");

export function checkAccountContacts(input: { email?: string; phone?: string }): Promise<{ emailAvailable?: boolean; phoneAvailable?: boolean }> {
  return apiPost("/admin/accounts/check-contacts", input);
}

export function createAccount(input: { name: string; email: string; password: string; confirmPassword: string; phone: string; role: "admin" | "manager"; permissionGroupIds?: string[] }): Promise<ApiAccount> {
  return apiPost<ApiAccount>("/admin/accounts", input);
}

export function updateAccount(id: string, input: Partial<Pick<ApiAccount, "name" | "role" | "status" | "permissionGroupIds">>): Promise<ApiAccount> {
  return apiPatch<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}`, input);
}

export function deleteAccount(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/admin/accounts/${encodeURIComponent(id)}`);
}

export const getPermissionGroups = (): Promise<ApiPermissionGroup[]> => apiGet<ApiPermissionGroup[]>("/admin/permission-groups");
export const getPermissionCatalog = (): Promise<{ modules: ModuleCategory[]; permissions: SystemPermission[] }> => apiGet("/admin/permission-groups/catalog");

export function createPermissionGroup(input: { name: string; description?: string; color: GroupColor; icon: GroupIcon; actions: PermissionAction[] }): Promise<ApiPermissionGroup> {
  return apiPost<ApiPermissionGroup>("/admin/permission-groups", input);
}

export function updatePermissionGroup(id: string, input: Partial<Pick<ApiPermissionGroup, "name" | "description" | "color" | "icon" | "actions" | "status">>): Promise<ApiPermissionGroup> {
  return apiPatch<ApiPermissionGroup>(`/admin/permission-groups/${encodeURIComponent(id)}`, input);
}

export function deletePermissionGroup(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/admin/permission-groups/${encodeURIComponent(id)}`);
}
