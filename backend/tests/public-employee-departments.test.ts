jest.mock("../src/repositories/user/employee.repository", () => ({
  userEmployeeRepository: { findDepartments: jest.fn() },
}));

import { userEmployeeRepository } from "../src/repositories/user/employee.repository";
import { userEmployeeService } from "../src/services/user/employee.service";

describe("public employee departments", () => {
  beforeEach(() => jest.clearAllMocks());

  it("queries only active, non-deleted employees without pagination", async () => {
    jest.mocked(userEmployeeRepository.findDepartments).mockResolvedValue(["HR_AD"]);

    expect(await userEmployeeService.getDepartments()).toEqual(["HR_AD"]);
    expect(userEmployeeRepository.findDepartments).toHaveBeenCalledWith({
      status: "active", isDeleted: { $ne: true },
    });
  });

  it("omits blank departments and deduplicates trimmed values", async () => {
    jest.mocked(userEmployeeRepository.findDepartments).mockResolvedValue([" IT ", "", "  ", "HR_AD", "IT"]);
    expect(await userEmployeeService.getDepartments()).toEqual(["HR_AD", "IT"]);
  });

  it("returns no departments when no public employees exist", async () => {
    jest.mocked(userEmployeeRepository.findDepartments).mockResolvedValue([]);
    expect(await userEmployeeService.getDepartments()).toEqual([]);
  });

  it("propagates database errors instead of treating them as empty data", async () => {
    jest.mocked(userEmployeeRepository.findDepartments).mockRejectedValue(new Error("Database unavailable"));
    await expect(userEmployeeService.getDepartments()).rejects.toThrow("Database unavailable");
  });
});
