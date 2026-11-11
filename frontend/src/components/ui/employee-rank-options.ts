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

/**
 * Thứ tự hiển thị trong bộ lọc cấp bậc (trang Nhân sự và trang admin).
 * Chỉ đổi thứ tự hiển thị; thứ tự xếp nhân viên trong sơ đồ phòng ban vẫn theo EMPLOYEE_RANK_OPTIONS_UI.
 */
const RANK_FILTER_ORDER: readonly string[] = ["Senior Management", "Middle Management", "Staff", "Intermediate Personnel"];
export const EMPLOYEE_RANK_FILTER_OPTIONS = [...EMPLOYEE_SELECTABLE_RANK_OPTIONS].sort(
  (left, right) => RANK_FILTER_ORDER.indexOf(left.value) - RANK_FILTER_ORDER.indexOf(right.value),
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
