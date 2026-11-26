import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminEmployeeService } from "../src/services/admin/employee.service";

const employees = [
  { _id: "1", employeeCode: "AC-00035", name: "Phan Thị Bảo Trung", email: "trung.phan@asiafnb.com" },
  { _id: "2", employeeCode: "AC-00034", name: "Nguyễn Thị Hồng Vân", email: "van.nguyen@asiafnb.com" },
];

beforeEach(() => {
  jest.spyOn(adminEmployeeRepository, "findAllForSearch").mockResolvedValue(employees as never);
});
afterEach(() => jest.restoreAllMocks());

it.each([
  ["van.nguyen@asiafnb.com", ["2"]],
  ["TRUNG.PHAN", ["1"]],
  ["AC-00035", ["1"]],
  ["hong van", ["2"]],
  ["@asiafnb.com", ["1", "2"]],
])("tìm nhân viên theo mã, tên hoặc email: %s", async (search, ids) => {
  const result = await adminEmployeeService.getEmployees({ search });
  expect(result.items.map((item) => String(item._id))).toEqual(ids);
});

it("thùng rác nhân viên cũng tìm được theo email", async () => {
  const result = await adminEmployeeService.getDeletedEmployees({ search: "trung.phan" });
  expect(result.items.map((item) => String(item._id))).toEqual(["1"]);
});
