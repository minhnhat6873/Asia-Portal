export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  joinDate: string;
  status: EmployeeStatus;
  description?: string;
}

export interface EmployeePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeListResult {
  items: Employee[];
  pagination: EmployeePagination;
}

export interface EmployeeListParams {
  search?: string;
  department?: string;
  position?: string;
  page?: number;
  limit?: number;
  sort?: "latest" | "oldest";
}
