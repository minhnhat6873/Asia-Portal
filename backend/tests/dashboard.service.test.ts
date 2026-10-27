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
  adminMediaRepository: { count: jest.fn(), hideExpiredPosts: jest.fn().mockResolvedValue({ modifiedCount: 0 }) },
}));

import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminMediaRepository } from "../src/repositories/admin/media.repository";
import { adminDashboardService } from "../src/services/admin/dashboard.service";
import EmployeeModel from "../src/models/employee.model";

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
    expect(adminMediaRepository.count).toHaveBeenNthCalledWith(1, { isDeleted: { $ne: true } });
    expect(adminMediaRepository.count).toHaveBeenNthCalledWith(2, { status: "published", isDeleted: { $ne: true } });
  });

  it("trả đúng số 0 khi không có hồ sơ hoặc bài viết ngoài thùng rác", async () => {
    jest.mocked(adminEmployeeRepository.count).mockResolvedValue(0);
    jest.mocked(adminEmployeeRepository.countDistinctDepartments).mockResolvedValue(0);
    jest.mocked(adminAccountRepository.countByStatus).mockResolvedValue(0);
    jest.mocked(adminMediaRepository.count).mockResolvedValue(0);
    await expect(adminDashboardService.getSummary()).resolves.toMatchObject({ totalEmployees: 0, totalDepartments: 0, totalMediaPosts: 0, publishedMediaPosts: 0 });
  });

  it("đếm phòng có nhân viên, bỏ giá trị rỗng và không đếm trùng khoảng trắng", async () => {
    const distinct = jest.spyOn(EmployeeModel, "distinct").mockResolvedValue(["BOD", "IT", " IT ", "", " ", null]);
    try {
      const actual = jest.requireActual<typeof import("../src/repositories/admin/employee.repository")>("../src/repositories/admin/employee.repository");
      await expect(actual.adminEmployeeRepository.countDistinctDepartments({ isDeleted: { $ne: true } })).resolves.toBe(2);
      expect(distinct).toHaveBeenCalledWith("department", { isDeleted: { $ne: true } });
    } finally { distinct.mockRestore(); }
  });
});
