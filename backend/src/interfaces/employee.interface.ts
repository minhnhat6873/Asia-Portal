export const EMPLOYEE_STATUSES = ["active", "probation", "inactive"] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface Employee {
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  rank?: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  avatarPublicId?: string;
  joinDate: Date;
  birthDate?: Date;
  status: EmployeeStatus;
  description?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: {
    accountId: string;
    name: string;
    email: string;
  };
  createdBy?: {
    accountId: string;
    name: string;
    email: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateEmployeeInput = Omit<
  Employee,
  "createdAt" | "updatedAt" | "isDeleted" | "deletedAt" | "deletedBy"
>;
export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export interface EmployeeListQuery {
  search?: string;
  department?: string;
  position?: string;
  rank?: string;
  status?: EmployeeStatus;
  page?: string;
  limit?: string;
  sort?: "latest" | "oldest";
}
