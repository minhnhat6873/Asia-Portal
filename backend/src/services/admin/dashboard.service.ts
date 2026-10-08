import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { adminMediaRepository } from "../../repositories/admin/media.repository";

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
      totalMediaPosts,
      publishedMediaPosts,
    ] = await Promise.all([
      adminEmployeeRepository.count({ isDeleted: { $ne: true } }),
      adminEmployeeRepository.count({ status: "active", isDeleted: { $ne: true } }),
      adminEmployeeRepository.count({ status: "probation", isDeleted: { $ne: true } }),
      adminEmployeeRepository.countDistinctDepartments({ isDeleted: { $ne: true } }),
      adminAccountRepository.countByStatus("pending"),
      adminAccountRepository.countByStatus("active"),
      adminAccountRepository.countByStatus("inactive"),
      adminMediaRepository.count({ isDeleted: { $ne: true } }),
      adminMediaRepository.count({ status: "published", isDeleted: { $ne: true } }),
    ]);

    return { totalEmployees, activeEmployees, probationEmployees, totalDepartments, totalMediaPosts, publishedMediaPosts, pendingAccounts, activeAccounts, lockedAccounts };
  },
};
