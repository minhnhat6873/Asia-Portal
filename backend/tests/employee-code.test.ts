import { createEmployeeSchema, updateEmployeeSchema } from "../src/validates/admin/employee.validate";
import { normalizeEmployeeCode } from "../src/utils/employee-code";

const base = { name: "Nguyễn Văn A", position: "Nhân viên IT", department: "Phòng IT", rank: "Staff", email: "vana@asiafnb.com", phone: "0936123456", location: "Hồ Chí Minh", joinDate: "2026-10-06", gender: "male", status: "active" };

describe("mã nhân viên AC-xxxxx", () => {
  it.each(["AC-00024", "ac-00024", " AC-99999 "])("chấp nhận %p", (code) => {
    const { error, value } = createEmployeeSchema.validate({ ...base, employeeCode: code });
    expect(error).toBeUndefined();
    expect(value.employeeCode).toBe(code.trim().toUpperCase());
  });

  it.each(["00024", "AC00024", "AC-0024", "AC-000024", "AC-0002A", "NV-00024", "AC_00024", "AC- 00024", ""])("từ chối %p", (code) => {
    const { error } = createEmployeeSchema.validate({ ...base, employeeCode: code });
    expect(error?.details[0]?.path).toEqual(["employeeCode"]);
  });

  it("báo lỗi tiếng Việt dễ hiểu", () => {
    const { error } = createEmployeeSchema.validate({ ...base, employeeCode: "00024" });
    expect(error?.message).toContain("AC-");
  });

  it("áp dụng cả khi sửa nhân viên", () => {
    expect(updateEmployeeSchema.validate({ employeeCode: "00024" }).error).toBeDefined();
    expect(updateEmployeeSchema.validate({ employeeCode: "AC-00024" }).error).toBeUndefined();
  });

  it.each([["00024", "AC-00024"], ["24", "AC-00024"], ["000123", "AC-00123"], ["ac00024", "AC-00024"], ["AC-24", "AC-00024"], ["AC-00024", "AC-00024"]])("chuyển mã cũ %p → %p", (raw, expected) => {
    expect(normalizeEmployeeCode(raw)).toBe(expected);
  });

  it.each(["123456", "NV-001", "AC-0002A", "", "AC-"])("không tự chuyển mã không hợp lệ %p", (raw) => {
    expect(normalizeEmployeeCode(raw)).toBeNull();
  });
});
