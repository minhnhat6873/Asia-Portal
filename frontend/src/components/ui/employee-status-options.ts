/**
 * Danh mục trạng thái nhân viên dùng chung.
 * `label`: tên hiển thị trên frontend.
 * `value`: giá trị hiện được backend chấp nhận và lưu trong database.
 *
 * Chưa nối vào form và bộ lọc cho đến khi mapping được duyệt.
 */
export const EMPLOYEE_STATUS_OPTIONS_UI = [
  { value: "active", label: "Đang làm việc" },
  { value: "probation", label: "Thử việc" },
  { value: "inactive", label: "Đã nghỉ việc" },
] as const;

export type EmployeeStatusValue =
  (typeof EMPLOYEE_STATUS_OPTIONS_UI)[number]["value"];

const statusByValue = new Map<string, string>(
  EMPLOYEE_STATUS_OPTIONS_UI.map(({ value, label }) => [value, label]),
);

export function getEmployeeStatusLabel(value?: string): string {
  if (!value) return "Chưa cập nhật";
  return statusByValue.get(value) ?? value;
}
