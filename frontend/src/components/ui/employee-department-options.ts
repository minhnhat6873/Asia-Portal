/**
 * Danh mục phòng ban dùng chung.
 * `label`: tên hiển thị trên frontend.
 * `value`: mã ổn định lưu trong database/API, không đổi khi đổi nhãn.
 */
export const EMPLOYEE_DEPARTMENT_OPTIONS = [
  { value: "BOD", label: "BOD" },
  { value: "INTERNATIONAL_SALES", label: "Kinh doanh quốc tế" },
  { value: "DOMESTIC_SALES", label: "Kinh doanh nội địa" },
  { value: "SALES_ADMIN", label: "Sales Admin" },
  { value: "MARKETING_COMMUNICATIONS", label: "Marketing & Truyền thông" },
  { value: "DESIGN", label: "Thiết kế" },
  { value: "OPERATIONS_ADMIN", label: "Operations Admin" },
  { value: "SOURCING_PURCHASING", label: "Mua hàng / Sourcing" },
  { value: "LOGISTICS_IMPORT_EXPORT", label: "Logistics / XNK" },
  { value: "INVENTORY", label: "Kho / Inventory" },
  { value: "PRODUCT_DEVELOPMENT", label: "R&D / Product Development" },
  { value: "RA_COMPLIANCE", label: "RA / Compliance" },
  { value: "FINANCE_ACCOUNTING", label: "Tài chính – Kế toán" },
  { value: "HR_ADMIN", label: "Nhân sự & Hành chính" },
  { value: "LEGAL", label: "Pháp chế" },
  { value: "IT_ERP", label: "IT + ERP" },
] as const;

export type EmployeeDepartmentValue =
  (typeof EMPLOYEE_DEPARTMENT_OPTIONS)[number]["value"];

const departmentByValue = new Map<string, string>(
  EMPLOYEE_DEPARTMENT_OPTIONS.map(({ value, label }) => [value, label]),
);
const departmentValueByLabel = new Map<string, string>(
  EMPLOYEE_DEPARTMENT_OPTIONS.flatMap(({ value, label }) => [[label, value], [`Phòng ${label}`, value]]),
);

/** Convert a current display label to its API code. */
export function normalizeEmployeeDepartment(value?: string): string {
  if (!value) return "";
  return departmentValueByLabel.get(value) ?? value;
}

export function getEmployeeDepartmentLabel(value?: string): string {
  if (!value) return "Chưa cập nhật";
  return departmentByValue.get(normalizeEmployeeDepartment(value)) ?? value.replace(/^Phòng\s+/i, "");
}
