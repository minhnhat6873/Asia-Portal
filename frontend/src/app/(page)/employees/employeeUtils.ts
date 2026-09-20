import type { Employee } from "@/config/employees";

export function getEmployeeAvatar(employee: Employee) {
  if (employee.avatar && employee.avatar !== "/assets/images/default-avatar.png") {
    return employee.avatar;
  }
  return employee.id <= 7 ? `/assets/images/employee-${employee.id}.png` : "/assets/images/default-avatar.png";
}

export function getEmployeeCode(employee: Employee) {
  return `ACF${String(employee.id).padStart(4, "0")}`;
}
