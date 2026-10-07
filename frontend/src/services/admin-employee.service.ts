import { apiDelete, apiGet, apiPatchFormData, apiPost, apiPostFormData } from "./api";

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
  gender: "male" | "female" | "other";
  status?: "active" | "probation" | "inactive";
  description?: string;
  avatar?: string;
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
  gender?: "male" | "female" | "other";
  status: "active" | "probation" | "inactive";
  description?: string;
  createdBy?: { accountId: string; name: string; email: string };
  deletedBy?: { accountId: string; name: string; email: string };
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminEmployeeListResult {
  items: AdminEmployeeResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminEmployeeListParams {
  search?: string;
  department?: string;
  rank?: string;
  status?: "active" | "probation" | "inactive";
  page?: number;
  limit?: number;
  sort?: "latest" | "oldest";
}

export function getAdminEmployees(
  params: AdminEmployeeListParams = {},
  signal?: AbortSignal,
): Promise<AdminEmployeeListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiGet<AdminEmployeeListResult>(`/admin/employees${suffix}`, signal);
}

export function getAdminEmployee(
  id: string,
  signal?: AbortSignal,
): Promise<AdminEmployeeResult> {
  return apiGet<AdminEmployeeResult>(`/admin/employees/${encodeURIComponent(id)}`, signal);
}

export function getDeletedAdminEmployees(
  params: Pick<AdminEmployeeListParams, "search" | "department" | "rank" | "status" | "page" | "limit"> = {},
  signal?: AbortSignal,
): Promise<AdminEmployeeListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiGet<AdminEmployeeListResult>(`/admin/employees/trash${suffix}`, signal);
}

export function createAdminEmployee(
  input: CreateAdminEmployeeInput,
  avatarFile: File | null,
): Promise<AdminEmployeeResult> {
  const body = new FormData();

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && (value !== "" || key === "avatar")) body.append(key, value);
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
    if (value !== undefined && (value !== "" || key === "avatar")) body.append(key, value);
  });

  if (avatarFile) body.append("avatar", avatarFile);

  return apiPatchFormData<AdminEmployeeResult>(`/admin/employees/${id}`, body);
}

export function softDeleteAdminEmployee(id: string): Promise<AdminEmployeeResult> {
  return apiDelete<AdminEmployeeResult>(`/admin/employees/${encodeURIComponent(id)}`);
}
export function restoreAdminEmployee(id: string): Promise<AdminEmployeeResult> {
  return apiPost<AdminEmployeeResult>(`/admin/employees/${encodeURIComponent(id)}/restore`, {});
}

export function permanentlyDeleteAdminEmployee(id: string): Promise<AdminEmployeeResult> {
  return apiDelete<AdminEmployeeResult>(`/admin/employees/${encodeURIComponent(id)}/permanent`);
}
