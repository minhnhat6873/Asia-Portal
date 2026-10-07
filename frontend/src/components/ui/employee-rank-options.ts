/**
 * Danh mục cấp bậc dùng chung.
 * `label`: tên hiển thị trên frontend.
 * `value`: giá trị hiện được backend chấp nhận và lưu trong database.
 *
 * Chưa nối vào form và bộ lọc cho đến khi mapping được duyệt.
 */
export const EMPLOYEE_RANK_OPTIONS_UI = [
  { value: "BOD", label: "Ban lãnh đạo" },
  { value: "Executive", label: "Ban điều hành" },
  { value: "Manager", label: "Quản lý" },
  { value: "Team Leader", label: "Trưởng nhóm" },
  { value: "Staff", label: "Nhân viên" },
  { value: "Intern", label: "Thực tập sinh" },
] as const;

export type EmployeeRankValue =
  (typeof EMPLOYEE_RANK_OPTIONS_UI)[number]["value"];

const rankByValue = new Map<string, string>(
  EMPLOYEE_RANK_OPTIONS_UI.map(({ value, label }) => [value, label]),
);

export function getEmployeeRankLabel(value?: string): string {
  if (!value) return "Chưa cập nhật";
  return rankByValue.get(value) ?? value;
}
