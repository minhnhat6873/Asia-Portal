import { apiGet } from "./api";
import type {
  Employee,
  EmployeeListParams,
  EmployeeListResult,
} from "@/types/employee";

interface ApiEmployee extends Omit<Employee, "id"> {
  _id: string;
}

interface ApiEmployeeListResult {
  items: ApiEmployee[];
  pagination: EmployeeListResult["pagination"];
}

function buildQuery(params: EmployeeListParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getPublicEmployees(
  params: EmployeeListParams,
  signal?: AbortSignal,
): Promise<EmployeeListResult> {
  const result = await apiGet<ApiEmployeeListResult>(
    `/user/employees${buildQuery(params)}`,
    signal,
  );

  return {
    ...result,
    items: result.items.map(({ _id, ...employee }) => ({ id: _id, ...employee })),
  };
}
