const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  message?: string;
  errors?: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readPayload<T>(response: Response): Promise<ApiResponse<T> | ApiErrorResponse | null> {
  return response.json().catch(() => null) as Promise<ApiResponse<T> | ApiErrorResponse | null>;
}

function throwIfRequestFailed<T>(
  response: Response,
  payload: ApiResponse<T> | ApiErrorResponse | null,
): asserts payload is ApiResponse<T> {
  if (response.ok && payload?.success) return;

  const errorPayload = payload as ApiErrorResponse | null;
  throw new ApiError(
    errorPayload?.message ?? "Không thể kết nối tới máy chủ",
    response.status,
    errorPayload?.errors ?? [],
  );
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    signal,
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}