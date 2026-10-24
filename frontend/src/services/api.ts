// Call the API through the frontend origin so authentication cookies belong to the frontend domain.
const API_URL = "/backend-api";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  message?: string;
  errors?: string[];
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: string[] = [],
    public readonly fieldErrors: Record<string, string> = {},
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
    errorPayload?.fieldErrors ?? {},
  );
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        credentials: "include",
        signal,
      });

      const payload = await readPayload<T>(response);
      throwIfRequestFailed(response, payload);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) throw error;
      const isTransient = error instanceof TypeError ||
        (error instanceof ApiError && [502, 503, 504].includes(error.status));
      if (!isTransient || attempt >= 2) throw error;
      await waitForRetry(400 * (attempt + 1), signal);
    }
  }
}

function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Request aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
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

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}

export async function apiPostFormData<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body,
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}


export async function apiPatchFormData<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    credentials: "include",
    body,
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}
