import { apiGet } from "@/services/api";

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  totalDepartments: number;
  totalMediaPosts: number;
  publishedMediaPosts: number;
  pendingAccounts: number;
  activeAccounts: number;
  lockedAccounts: number;
}

export function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>("/admin/dashboard/summary", signal);
}
