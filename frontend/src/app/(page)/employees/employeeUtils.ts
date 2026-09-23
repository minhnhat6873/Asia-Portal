import type { Employee } from "@/types/employee";

export function getEmployeeAvatar(employee: Employee) {
  return employee.avatar || "/assets/images/default-avatar.png";
}

export function getEmployeeCode(employee: Employee) {
  return employee.employeeCode;
}

export function formatJoinDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN").format(date);
}
