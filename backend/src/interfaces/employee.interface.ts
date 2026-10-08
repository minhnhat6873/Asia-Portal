export const EMPLOYEE_STATUSES = ["active", "probation", "inactive"] as const;
export const EMPLOYEE_GENDERS = ["male", "female", "other"] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export type EmployeeGender = (typeof EMPLOYEE_GENDERS)[number];

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
  chartAvatar?: string;
  chartAvatarPublicId?: string;
  joinDate: Date;
  birthDate?: Date;
  gender?: EmployeeGender;
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
