jest.mock("../src/repositories/admin/employee.repository", () => ({
  adminEmployeeRepository: {
    findByEmail: jest.fn(),
    findByEmployeeCode: jest.fn(),
    findActiveByRank: jest.fn(),
    findDeletedById: jest.fn(),
    create: jest.fn(),
    softDeleteById: jest.fn(),
    restoreById: jest.fn(),
    permanentlyDeleteById: jest.fn(),
    findAllForSearch: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminEmployeeService } from "../src/services/admin/employee.service";

const employeeId = "507f1f77bcf86cd799439011";
const employee = {
  _id: employeeId,
  employeeCode: "NV-001",
  name: "Nguyễn Văn A",
  rank: "Staff",
};

describe("admin employee service delete flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(adminEmployeeRepository.findDeletedById).mockResolvedValue(employee as never);
  });

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

describe("admin employee CEO constraint", () => {
  beforeEach(() => jest.clearAllMocks());

  it("từ chối tạo CEO thứ hai", async () => {
    jest.mocked(adminEmployeeRepository.findByEmail).mockResolvedValue(null);
    jest.mocked(adminEmployeeRepository.findByEmployeeCode).mockResolvedValue(null);
    jest.mocked(adminEmployeeRepository.findActiveByRank).mockResolvedValue(employee as never);

    await expect(adminEmployeeService.createEmployee({ rank: "CEO" } as never)).rejects.toMatchObject({
      statusCode: 409,
      message: "Công ty chỉ được có duy nhất một CEO",
    });
  });

  it("cho phép tạo cấp bậc khác khi đã có CEO", async () => {
    jest.mocked(adminEmployeeRepository.findByEmail).mockResolvedValue(null);
    jest.mocked(adminEmployeeRepository.findByEmployeeCode).mockResolvedValue(null);
    jest.mocked(adminEmployeeRepository.create).mockResolvedValue(employee as never);

    await expect(adminEmployeeService.createEmployee({ rank: "Senior Management" } as never)).resolves.toEqual(employee);
    expect(adminEmployeeRepository.findActiveByRank).not.toHaveBeenCalled();
  });
});

describe("admin employee creation order", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(adminEmployeeRepository.findAll).mockResolvedValue([]);
    jest.mocked(adminEmployeeRepository.count).mockResolvedValue(21);
  });

  it.each([
    [undefined, -1],
    ["latest", -1],
    ["oldest", 1],
  ] as const)("sort=%s sorts by creation time before pagination", async (sort, direction) => {
    const result = await adminEmployeeService.getEmployees({ sort, page: "2", limit: "10", department: "IT" });

    expect(adminEmployeeRepository.findAll).toHaveBeenCalledWith({
      filter: { isDeleted: { $ne: true }, department: "IT" },
      sort: { createdAt: direction, _id: direction },
      skip: 10,
      limit: 10,
    });
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 21, totalPages: 3 });
  });

  it("preserves creation order when searching and slicing pages", async () => {
    const ordered = [
      { ...employee, employeeCode: "NV-999", name: "Nguyễn Mới", createdAt: new Date("2026-10-21"), joinDate: new Date("2020-01-01") },
      { ...employee, employeeCode: "NV-001", name: "Nguyễn Cũ", createdAt: new Date("2026-10-20"), joinDate: new Date("2026-10-21") },
    ];
    jest.mocked(adminEmployeeRepository.findAllForSearch).mockResolvedValue(ordered as never);
    const result = await adminEmployeeService.getEmployees({ search: "nguyen", page: "2", limit: "1" });

    expect(adminEmployeeRepository.findAllForSearch).toHaveBeenCalledWith(
      { isDeleted: { $ne: true } }, { createdAt: -1, _id: -1 },
    );
    expect(result.items).toEqual([ordered[1]]);
    expect(result.pagination.total).toBe(2);
    expect(adminEmployeeRepository.findAll).not.toHaveBeenCalled();
  });
});

describe("admin employee normalized search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("chỉ tìm theo mã nhân viên và họ tên, không phân biệt dấu", async () => {
    jest.mocked(adminEmployeeRepository.findAllForSearch).mockResolvedValue([
      { employeeCode: "ACF001", name: "Đặng Nguyễn", department: "Kế toán" },
      { employeeCode: "ACF002", name: "Lê Minh", department: "Đặng Nguyễn" },
    ] as never);

    const result = await adminEmployeeService.getEmployees({ search: "  dang   nguyen  " });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.employeeCode).toBe("ACF001");
  });
});
