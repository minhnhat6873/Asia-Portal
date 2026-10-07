jest.mock("../src/repositories/admin/employee.repository", () => ({
  adminEmployeeRepository: {
    findByEmail: jest.fn(),
    findByEmployeeCode: jest.fn(),
    create: jest.fn(),
    softDeleteById: jest.fn(),
    restoreById: jest.fn(),
    permanentlyDeleteById: jest.fn(),
  },
}));

import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminEmployeeService } from "../src/services/admin/employee.service";

const employeeId = "507f1f77bcf86cd799439011";
const employee = {
  _id: employeeId,
  employeeCode: "NV-001",
  name: "Nguyễn Văn A",
};

describe("admin employee service delete flow", () => {
  beforeEach(() => jest.clearAllMocks());

  it("chỉ xóa mềm thông qua repository soft delete", async () => {
    jest.mocked(adminEmployeeRepository.softDeleteById).mockResolvedValue(employee as never);
    await expect(adminEmployeeService.softDeleteEmployee(employeeId, undefined)).resolves.toEqual(employee);
    expect(adminEmployeeRepository.softDeleteById).toHaveBeenCalledWith(employeeId, undefined);
  });

  it("khôi phục hồ sơ trong thùng rác", async () => {
    jest.mocked(adminEmployeeRepository.restoreById).mockResolvedValue(employee as never);
    await expect(adminEmployeeService.restoreEmployee(employeeId)).resolves.toEqual(employee);
  });

  it("xóa vĩnh viễn hồ sơ trong thùng rác", async () => {
    jest.mocked(adminEmployeeRepository.permanentlyDeleteById).mockResolvedValue(employee as never);
    await expect(adminEmployeeService.permanentlyDeleteEmployee(employeeId)).resolves.toEqual(employee);
  });

  it("không xóa vĩnh viễn khi hồ sơ không nằm trong thùng rác", async () => {
    jest.mocked(adminEmployeeRepository.permanentlyDeleteById).mockResolvedValue(null);
    await expect(adminEmployeeService.permanentlyDeleteEmployee(employeeId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
