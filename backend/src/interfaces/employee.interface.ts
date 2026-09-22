export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface Employee {
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  joinDate: Date;
  status: EmployeeStatus;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateEmployeeInput = Omit<Employee, "createdAt" | "updatedAt">;
export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export interface EmployeeListQuery {
  search?: string;
  department?: string;
  position?: string;
  status?: EmployeeStatus;
  page?: string;
  limit?: string;
  sort?: "latest" | "oldest";
}