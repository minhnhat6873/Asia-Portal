jest.mock("../src/repositories/admin/employee.repository", () => ({
  adminEmployeeRepository: {
    count: jest.fn(),
    countDistinctDepartments: jest.fn(),
  },
}));

jest.mock("../src/repositories/admin/account.repository", () => ({
  adminAccountRepository: {
    countByStatus: jest.fn(),
  },
}));

jest.mock("../src/repositories/admin/media.repository", () => ({
  adminMediaRepository: { count: jest.fn() },
}));

import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminMediaRepository } from "../src/repositories/admin/media.repository";
import { adminDashboardService } from "../src/services/admin/dashboard.service";

describe("dashboard employee summary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("đếm tổng, đang làm việc và thử việc từ các hồ sơ chưa xóa", async () => {
    jest.mocked(adminEmployeeRepository.count)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(2);
    jest.mocked(adminEmployeeRepository.countDistinctDepartments).mockResolvedValueOnce(5);
    jest.mocked(adminAccountRepository.countByStatus)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);
    jest.mocked(adminMediaRepository.count)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(5);

    await expect(adminDashboardService.getSummary()).resolves.toMatchObject({
      totalEmployees: 12,
      activeEmployees: 9,
      probationEmployees: 2,
      totalDepartments: 5,
      totalMediaPosts: 6,
      publishedMediaPosts: 5,
    });

    expect(adminEmployeeRepository.count).toHaveBeenNthCalledWith(1, {
      isDeleted: { $ne: true },
    });
    expect(adminEmployeeRepository.count).toHaveBeenNthCalledWith(2, {
      status: "active",
      isDeleted: { $ne: true },
    });
    expect(adminEmployeeRepository.count).toHaveBeenNthCalledWith(3, {
      status: "probation",
      isDeleted: { $ne: true },
    });
    expect(adminEmployeeRepository.countDistinctDepartments).toHaveBeenCalledWith({
      isDeleted: { $ne: true },
    });
  });
});
