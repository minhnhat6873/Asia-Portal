import { ApiError, apiDelete, apiGet, apiPost, apiPostFormData } from "./api";
export interface AvatarResult { avatar: string; customAvatar: boolean }

export interface UserAccount {
  id: string; name: string; email: string; role: "user"; status: string; phone?: string;
  /** Shows the "Vào trang quản trị" link only; the admin portal still asks for its own sign-in. */
  canAccessAdmin?: boolean;
  /** From the employee record with the same email (empty when there is none). */
  position?: string; department?: string;
  /** Own picture, else the HR photo, else "" (initials are shown). */
  avatar?: string;
  /** True when the person uploaded their own picture. */
  customAvatar?: boolean;
}
export interface UserProfile {
  account: { name: string; email: string; phone: string; createdAt?: string; canAccessAdmin: boolean; avatar: string; customAvatar: boolean };
  employee: { employeeCode: string; name: string; position: string; department: string; phone: string; location: string; avatar: string; joinDate?: string } | null;
}
export interface UserOtpResult { email: string; expiresInSeconds: number; resendAfterSeconds: number; }
export type UserOtpPurpose = "register" | "reset";
const root = "/backend-api/user/auth";
async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(root + path, {
      method: body === undefined ? "GET" : "POST", credentials: "include", cache: "no-store", signal: controller.signal,
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json", "X-Requested-With": "AsiaPortal" }, body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) throw new ApiError(payload?.message ?? "Không thể kết nối máy chủ. Vui lòng thử lại.", response.status, payload?.errors ?? [], payload?.fieldErrors ?? {});
    return payload.data as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Máy chủ phản hồi quá lâu. Vui lòng thử lại.");
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
let restoring: Promise<UserAccount> | null = null;
export function getUserSession(): Promise<UserAccount> {
  if (restoring) return restoring;
  const controller = new AbortController();
  const restore = async () => {
    try { return await request<UserAccount>("/me", undefined, controller.signal); }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
    return request<UserAccount>("/refresh", {}, controller.signal);
  };
  const timer = setTimeout(() => controller.abort(), 16000);
  const pending = (typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("asia-user-session-refresh", { signal: controller.signal }, restore) : restore())
    .finally(() => { clearTimeout(timer); if (restoring === pending) restoring = null; });
  restoring = pending;
  return pending;
}
export const userAuthService = {
  async login(email: string, password: string, rememberMe: boolean) {
    const account = await request<UserAccount>("/login", { email, password, rememberMe });
    window.dispatchEvent(new Event("asia-user-session-changed"));
    return account;
  },
  async logout() {
    await request("/logout", {});
    window.dispatchEvent(new Event("asia-user-session-changed"));
  },
  getProfile(signal?: AbortSignal) { return apiGet<UserProfile>("/user/account/profile", signal); },
  changePassword(data: { currentPassword: string; password: string; confirmPassword: string }) { return apiPost<void>("/user/account/change-password", data); },
  logoutOthers() { return apiPost<{ count: number }>("/user/account/logout-others", {}); },
  uploadAvatar(file: File) {
    const body = new FormData();
    body.append("avatar", file);
    return apiPostFormData<AvatarResult>("/user/account/avatar", body);
  },
  removeAvatar() { return apiDelete<AvatarResult>("/user/account/avatar"); },
  register(data: { name: string; phone: string; email: string; password: string; confirmPassword: string }) { return request<UserOtpResult>("/register", data); },
  forgot(email: string) { return request<UserOtpResult>("/forgot-password", { email }); },
  verify(email: string, code: string, purpose: UserOtpPurpose) { return request(`/${purpose === "register" ? "register" : "forgot-password"}/verify-otp`, { email, code }); },
  resend(email: string, purpose: UserOtpPurpose) { return request<UserOtpResult>(`/${purpose === "register" ? "register" : "forgot-password"}/resend-otp`, { email }); },
  reset(email: string, code: string, password: string, confirmPassword: string) { return request("/forgot-password/reset", { email, code, password, confirmPassword }); },
};
