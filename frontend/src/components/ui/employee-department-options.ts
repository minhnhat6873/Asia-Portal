/**
 * Danh mục phòng ban dùng chung.
 * `label`: tên hiển thị trên frontend.
 * `value`: mã ổn định lưu trong database/API, không đổi khi đổi nhãn.
 */
export const EMPLOYEE_DEPARTMENT_OPTIONS = [
  { value: "BOD", label: "Phòng BOD" },
  { value: "INTERNATIONAL_SALES", label: "Phòng Kinh doanh quốc tế" },
  { value: "DOMESTIC_SALES", label: "Phòng Kinh doanh nội địa" },
  { value: "SALES_ADMIN", label: "Phòng Sales Admin" },
  { value: "MARKETING_COMMUNICATIONS", label: "Phòng Marketing & Truyền thông" },
  { value: "DESIGN", label: "Phòng Thiết kế" },
  { value: "OPERATIONS_ADMIN", label: "Phòng Operations Admin" },
  { value: "SOURCING_PURCHASING", label: "Phòng Mua hàng / Sourcing" },
  { value: "LOGISTICS_IMPORT_EXPORT", label: "Phòng Logistics / XNK" },
  { value: "INVENTORY", label: "Phòng Kho / Inventory" },
  { value: "PRODUCT_DEVELOPMENT", label: "Phòng R&D / Product Development" },
  { value: "RA_COMPLIANCE", label: "Phòng RA / Compliance" },
  { value: "FINANCE_ACCOUNTING", label: "Phòng Tài chính – Kế toán" },
  { value: "HR_ADMIN", label: "Phòng Nhân sự & Hành chính" },
  { value: "LEGAL", label: "Phòng Pháp chế" },
  { value: "IT_ERP", label: "Phòng IT + ERP" },
] as const;

export type EmployeeDepartmentValue =
  (typeof EMPLOYEE_DEPARTMENT_OPTIONS)[number]["value"];

const departmentByValue = new Map<string, string>(
  EMPLOYEE_DEPARTMENT_OPTIONS.map(({ value, label }) => [value, label]),
);
const departmentValueByLabel = new Map<string, string>(
  EMPLOYEE_DEPARTMENT_OPTIONS.map(({ value, label }) => [label, value]),
);

/** Convert a current display label to its API code. */
export function normalizeEmployeeDepartment(value?: string): string {
  if (!value) return "";
  return departmentValueByLabel.get(value) ?? value;
}

export function getEmployeeDepartmentLabel(value?: string): string {
  if (!value) return "Chưa cập nhật";
  return departmentByValue.get(normalizeEmployeeDepartment(value)) ?? value;
}
