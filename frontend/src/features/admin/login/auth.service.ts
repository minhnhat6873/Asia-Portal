import { apiGet, apiPost, apiPatch } from "@/services/api";

export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: "pending" | "active" | "inactive";
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
export interface PasswordChangeOtpRequest {
  requestId: string;
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}
export function requestAdminPasswordChangeOtp(currentPassword: string, newPassword: string): Promise<PasswordChangeOtpRequest> {
  return apiPost("/admin/auth/password/request-otp", { currentPassword, newPassword });
}
export function resendAdminPasswordChangeOtp(requestId: string): Promise<PasswordChangeOtpRequest> {
  return apiPost("/admin/auth/password/resend-otp", { requestId });
}
export function changeAdminPassword(requestId: string, code: string): Promise<void> {
  return apiPatch<void>("/admin/auth/password", { requestId, code });
}

export function requestAdminEmailChangeOtp(newEmail: string): Promise<PasswordChangeOtpRequest> {
  return apiPost("/admin/auth/email/request-otp", { newEmail });
}
export function resendAdminEmailChangeOtp(requestId: string): Promise<PasswordChangeOtpRequest> {
  return apiPost("/admin/auth/email/resend-otp", { requestId });
}
export function changeAdminEmail(requestId: string, code: string): Promise<{ email: string }> {
  return apiPatch("/admin/auth/email", { requestId, code });
}
