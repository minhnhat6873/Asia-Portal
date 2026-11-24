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
  | "meetings:view" | "meetings:create" | "meetings:update" | "meetings:delete"
  | "accounts:manage-users" | "accounts:trash"
  | "vehicles:manage" | "vehicles:delete";

// Why a locked account is locked. "restored" = came back from the trash, still locked.
export type AccountLockKind = "manual" | "employee-left" | "employee-deleted" | "restored";
export interface AccountLock { kind: AccountLockKind; note?: string; byName?: string; at: string }

export interface ApiAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  role: ApiAccountRole;
  status: ApiAccountStatus;
  permissionGroupIds: string[];
  lock?: AccountLock | null;
  /** Own picture, else the linked employee photo, else "". */
  avatar?: string;
  deletedAt?: string;
  deletedBy?: { name: string };
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

export function createAccount(input: { name: string; email: string; password: string; confirmPassword: string; phone: string; role: ApiAccountRole; permissionGroupIds?: string[] }): Promise<ApiAccount> {
  return apiPost<ApiAccount>("/admin/accounts", input);
}

// Employee records that a new account can be linked to (matched by email).
export interface EmployeeLookupResult {
  id: string; employeeCode: string; name: string; email: string; phone: string;
  department: string; position: string; status: string;
  account: { id: string; role: ApiAccountRole; status: ApiAccountStatus; inTrash?: boolean } | null;
}
export function lookupEmployeesForAccount(query: string, signal?: AbortSignal): Promise<EmployeeLookupResult[]> {
  return apiGet<EmployeeLookupResult[]>(`/admin/accounts/employee-lookup?q=${encodeURIComponent(query)}`, signal);
}

export function updateAccount(id: string, input: Partial<Pick<ApiAccount, "name" | "email" | "phone" | "notes" | "role" | "status" | "permissionGroupIds">>): Promise<ApiAccount> {
  return apiPatch<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}`, input);
}

export function resetAccountPassword(id: string, input: { password: string; confirmPassword: string; notifyUser: boolean }): Promise<{ notificationSent: boolean }> {
  return apiPatch(`/admin/accounts/${encodeURIComponent(id)}/password`, input);
}

// Soft delete: moves the account to the account trash.
export function deleteAccount(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/admin/accounts/${encodeURIComponent(id)}`);
}

export function lockAccount(id: string, reason: string): Promise<ApiAccount> {
  return apiPost<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}/lock`, { reason });
}
export function unlockAccount(id: string): Promise<ApiAccount> {
  return apiPost<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}/unlock`, {});
}

export const getDeletedAccounts = (): Promise<ApiAccount[]> => apiGet<ApiAccount[]>("/admin/accounts/trash");
export function restoreAccount(id: string): Promise<ApiAccount> {
  return apiPatch<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}/restore`, {});
}
export function permanentlyDeleteAccount(id: string): Promise<ApiAccount> {
  return apiDelete<ApiAccount>(`/admin/accounts/${encodeURIComponent(id)}/permanent`);
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
