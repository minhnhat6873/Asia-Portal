/**
 * Danh mục cấp bậc dùng chung.
 * `label`: tên hiển thị trên frontend.
 * `value`: giá trị hiện được backend chấp nhận và lưu trong database.
 *
 * Giữ CEO để đọc dữ liệu cũ; các lựa chọn hiện tại dùng danh sách bên dưới.
 */
export const EMPLOYEE_RANK_OPTIONS_UI = [
  { value: "CEO", label: "CEO" },
  { value: "Senior Management", label: "Quản lý cấp cao" },
  { value: "Middle Management", label: "Quản lý cấp trung" },
  { value: "Intermediate Personnel", label: "Nhân sự cấp trung" },
  { value: "Staff", label: "Chuyên viên/Nhân viên" },
] as const;

export const EMPLOYEE_SELECTABLE_RANK_OPTIONS = EMPLOYEE_RANK_OPTIONS_UI.filter(
  (option) => option.value !== "CEO",
);

export type EmployeeRankValue =
  (typeof EMPLOYEE_RANK_OPTIONS_UI)[number]["value"];

const rankByValue = new Map<string, string>(
  EMPLOYEE_RANK_OPTIONS_UI.map(({ value, label }) => [value, label]),
);

export function getEmployeeRankLabel(value?: string): string {
  if (!value) return "Chưa cập nhật";
  return rankByValue.get(value) ?? value;
}
