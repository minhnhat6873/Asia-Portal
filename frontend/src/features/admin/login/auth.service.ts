import { apiGet, apiPost } from "@/services/api";

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager";
  permissions: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function loginAdmin(payload: LoginPayload): Promise<AuthenticatedAdmin> {
  return apiPost<AuthenticatedAdmin>("/admin/auth/login", payload);
}

export function getCurrentAdmin(signal?: AbortSignal): Promise<AuthenticatedAdmin> {
  return apiGet<AuthenticatedAdmin>("/admin/auth/me", signal);
}

export function refreshAdminSession(): Promise<AuthenticatedAdmin> {
  return apiPost<AuthenticatedAdmin>("/admin/auth/refresh", {});
}

export function logoutAdmin(): Promise<void> {
  return apiPost<void>("/admin/auth/logout", {});
}

export function getAdminRoleLabel(role: AuthenticatedAdmin["role"]): string {
  return role === "admin" ? "Toàn quyền Admin" : "Quản lý";
}