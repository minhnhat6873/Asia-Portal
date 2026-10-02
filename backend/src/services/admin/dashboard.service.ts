import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  totalMediaPosts: number;
  publishedMediaPosts: number;
  pendingAccounts: number;
  activeAccounts: number;
  lockedAccounts: number;
}

export const adminDashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const [
      totalEmployees,
      activeEmployees,
      pendingAccounts,
      activeAccounts,
      lockedAccounts,
    ] = await Promise.all([
      adminEmployeeRepository.count({}),
      adminEmployeeRepository.count({ status: "active" }),
      adminAccountRepository.countByStatus("pending"),
      adminAccountRepository.countByStatus("active"),
      adminAccountRepository.countByStatus("inactive"),
    ]);

    return { totalEmployees, activeEmployees, probationEmployees: 0, totalMediaPosts: 0, publishedMediaPosts: 0, pendingAccounts, activeAccounts, lockedAccounts };
  },
};
