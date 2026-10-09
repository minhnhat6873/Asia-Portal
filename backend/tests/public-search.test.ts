jest.mock("../src/repositories/user/employee.repository", () => ({
  userEmployeeRepository: {
    findAllForSearch: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock("../src/repositories/user/media.repository", () => ({
  userMediaRepository: {
    findAllForSearch: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

import { userEmployeeRepository } from "../src/repositories/user/employee.repository";
import { userMediaRepository } from "../src/repositories/user/media.repository";
import { userEmployeeService } from "../src/services/user/employee.service";
import { userMediaService } from "../src/services/user/media.service";

describe("public employee search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("searches accent-insensitively by code and name only before pagination", async () => {
    jest.mocked(userEmployeeRepository.findAllForSearch).mockResolvedValue([
      { employeeCode: "ACF001", name: "Đặng Nguyễn", department: "Kế toán" },
      { employeeCode: "ACF002", name: "Lê Minh", department: "Đặng Nguyễn" },
    ] as never);

    const result = await userEmployeeService.getEmployees({ search: " DANG   nguyen ", limit: "1" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.employeeCode).toBe("ACF001");
    expect(result.pagination.total).toBe(1);
    expect(userEmployeeRepository.findAll).not.toHaveBeenCalled();
  });
});

describe("public media search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("searches accent-insensitively by title and Sapo only before pagination", async () => {
    jest.mocked(userMediaRepository.findAllForSearch).mockResolvedValue([
      { title: "Sản phẩm mới", summary: "<p>Nguồn nguyên liệu thuần Việt</p>", authorDepartment: "MKT" },
      { title: "Thông báo", summary: "Lịch nghỉ lễ", authorDepartment: "Nguồn nguyên liệu thuần Việt" },
    ] as never);

    const result = await userMediaService.getMedia({ search: " NGUON   nguyen lieu thuan viet ", limit: "1" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Sản phẩm mới");
    expect(result.pagination.total).toBe(1);
    expect(userMediaRepository.findAll).not.toHaveBeenCalled();
  });
});
