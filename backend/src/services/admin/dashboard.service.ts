import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";

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

export const adminDashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const [
      totalEmployees,
      activeEmployees,
      probationEmployees,
      totalDepartments,
      pendingAccounts,
      activeAccounts,
      lockedAccounts,
    ] = await Promise.all([
      adminEmployeeRepository.count({ isDeleted: { $ne: true } }),
      adminEmployeeRepository.count({ status: "active", isDeleted: { $ne: true } }),
      adminEmployeeRepository.count({ status: "probation", isDeleted: { $ne: true } }),
      adminEmployeeRepository.countDistinctDepartments({ isDeleted: { $ne: true } }),
      adminAccountRepository.countByStatus("pending"),
      adminAccountRepository.countByStatus("active"),
      adminAccountRepository.countByStatus("inactive"),
    ]);

    return { totalEmployees, activeEmployees, probationEmployees, totalDepartments, totalMediaPosts: 0, publishedMediaPosts: 0, pendingAccounts, activeAccounts, lockedAccounts };
  },
};
