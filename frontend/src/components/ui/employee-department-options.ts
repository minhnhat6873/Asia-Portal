/**
 * Danh mục phòng ban dùng chung.
 * `label`: tên hiển thị trên frontend.
 * `value`: mã ổn định dự kiến lưu trong database/API.
 *
 * Chưa nối vào form và bộ lọc cho đến khi mapping được duyệt.
 */
export const EMPLOYEE_DEPARTMENT_OPTIONS = [
  { value: "BOD", label: "Phòng BOD" },
  { value: "HR_AD", label: "Phòng HR&AD" },
  { value: "F_AND_A", label: "Phòng F&A" },
  { value: "MKT", label: "Phòng MKT" },
  { value: "DESIGN", label: "Phòng Design" },
  { value: "LEGAL", label: "Phòng Legal" },
  { value: "IT", label: "Phòng IT" },
  { value: "LOGISTICS", label: "Phòng Logistics" },
  { value: "R_AND_D", label: "Phòng R&D" },
  { value: "PURCHASING", label: "Phòng Purchasing" },
  { value: "SALES", label: "Phòng Sales" },
] as const;

export type EmployeeDepartmentValue =
  (typeof EMPLOYEE_DEPARTMENT_OPTIONS)[number]["value"];

const departmentByValue = new Map<string, string>(
  EMPLOYEE_DEPARTMENT_OPTIONS.map(({ value, label }) => [value, label]),
);
const departmentValueByLabel = new Map<string, EmployeeDepartmentValue>(
  EMPLOYEE_DEPARTMENT_OPTIONS.map(({ value, label }) => [label, value]),
);

/** Hỗ trợ cả mã mới và tên phòng ban cũ đang có trong localStorage/database. */
export function normalizeEmployeeDepartment(value?: string): string {
  if (!value) return "";
  return departmentValueByLabel.get(value) ?? value;
}

export function getEmployeeDepartmentLabel(value?: string): string {
  if (!value) return "Chưa cập nhật";
  return departmentByValue.get(normalizeEmployeeDepartment(value)) ?? value;
}
