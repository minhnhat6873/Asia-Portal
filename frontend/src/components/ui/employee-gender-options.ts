export const EMPLOYEE_GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
] as const;

export function getEmployeeGenderLabel(value?: string): string {
  return EMPLOYEE_GENDER_OPTIONS.find((option) => option.value === value)?.label ?? "Chưa có dữ liệu";
}
