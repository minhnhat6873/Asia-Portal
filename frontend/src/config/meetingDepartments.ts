import { normalizeEmployeeDepartment } from "@/components/ui/employee-department-options";

/** Shared department names for the public and admin meeting forms. */
export const MEETING_DEPARTMENTS = [
  "BOD",
  "HR&AD",
  "F&A",
  "MARKETING",
  "EXPORT SALES",
  "DOMESTIC SALES",
  "IT",
  "PURCHASING",
  "DESIGN",
  "LOGISTICS",
  "R&D",
  "LEGAL",
] as const;

const legacyDepartmentNames: Record<string, string> = {
  BOD: "BOD",
  HR_ADMIN: "HR&AD",
  FINANCE_ACCOUNTING: "F&A",
  MARKETING_COMMUNICATIONS: "MARKETING",
  INTERNATIONAL_SALES: "EXPORT SALES",
  DOMESTIC_SALES: "DOMESTIC SALES",
  IT_ERP: "IT",
  SOURCING_PURCHASING: "PURCHASING",
  DESIGN: "DESIGN",
  LOGISTICS_IMPORT_EXPORT: "LOGISTICS",
  PRODUCT_DEVELOPMENT: "R&D",
  LEGAL: "LEGAL",
};

/** Match old employee department codes/labels when editing an existing booking. */
export function getMeetingDepartmentName(value?: string): string {
  const department = value?.trim() ?? "";
  return legacyDepartmentNames[normalizeEmployeeDepartment(department)] ?? department;
}
