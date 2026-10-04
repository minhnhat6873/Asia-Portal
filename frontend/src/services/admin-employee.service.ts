import { apiPatchFormData, apiPostFormData } from "./api";

export interface CreateAdminEmployeeInput {
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  rank: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  birthDate?: string;
  status?: "active" | "probation" | "inactive";
  description?: string;
}

export interface AdminEmployeeResult {
  _id: string;
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  rank?: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  joinDate: string;
  birthDate?: string;
  status: "active" | "probation" | "inactive";
  description?: string;
  createdBy?: { accountId: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

export function createAdminEmployee(
  input: CreateAdminEmployeeInput,
  avatarFile: File | null,
): Promise<AdminEmployeeResult> {
  const body = new FormData();

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") body.append(key, value);
  });

  if (avatarFile) body.append("avatar", avatarFile);

  return apiPostFormData<AdminEmployeeResult>("/admin/employees", body);
}


export function updateAdminEmployee(
  id: string,
  input: CreateAdminEmployeeInput,
  avatarFile: File | null,
): Promise<AdminEmployeeResult> {
  const body = new FormData();

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") body.append(key, value);
  });

  if (avatarFile) body.append("avatar", avatarFile);

  return apiPatchFormData<AdminEmployeeResult>(`/admin/employees/${id}`, body);
}
