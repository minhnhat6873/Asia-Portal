import { apiDelete, apiGetWithTimeout } from "./api";
import type { ApiAccount } from "./access-control.service";

export interface AdminLoginSession {
  id: string;
  isCurrent: boolean;
  browser: string;
  operatingSystem: string;
  ipAddress: string | null;
  lastIpAddress: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  expiresAt: string;
  persistent: boolean;
}
export interface SessionListResult {
  account: { id: string; name: string; email: string };
  items: AdminLoginSession[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
function queryFor(accountId: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({ accountId, ...extra }).toString();
}
export const getSessionAccounts = (signal?: AbortSignal) => apiGetWithTimeout<ApiAccount[]>("/admin/accounts", signal);
export const getLoginSessions = (accountId: string, page: number, signal?: AbortSignal) =>
  apiGetWithTimeout<SessionListResult>(`/admin/auth/sessions?${queryFor(accountId, { page: String(page), limit: "10" })}`, signal);
export const revokeLoginSession = (accountId: string, id: string) =>
  apiDelete<{ signedOut: boolean }>(`/admin/auth/sessions/${encodeURIComponent(id)}?${queryFor(accountId)}`);
export const revokeLoginSessions = (accountId: string, scope: "all" | "others") =>
  apiDelete<{ signedOut: boolean }>(`/admin/auth/sessions?${queryFor(accountId, { scope })}`);
