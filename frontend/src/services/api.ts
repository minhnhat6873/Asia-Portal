// Call the API through the frontend origin so authentication cookies belong to the frontend domain.
const API_URL = "/backend-api";
const MUTATION_HEADERS = { "X-Requested-With": "AsiaPortal" };
let pendingRefresh: Promise<unknown> | null = null;

// Deduplicate in this tab and serialize across tabs before rotating a cookie.
export function refreshApiSession<T>(signal?: AbortSignal): Promise<T> {
  if (pendingRefresh) return pendingRefresh as Promise<T>;
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const restore = async () => {
    // Another tab may already have refreshed while this tab waited for the lock.
    const current = await fetch(`${API_URL}/admin/auth/me`, { credentials: "include", cache: "no-store", signal: controller.signal });
    const currentPayload = await readPayload<T>(current);
    if (current.ok && currentPayload?.success) return currentPayload.data;
    if (current.status !== 401) throwIfRequestFailed(current, currentPayload);
    const response = await fetch(`${API_URL}/admin/auth/refresh`, {
      method: "POST", credentials: "include", signal: controller.signal,
      headers: { ...MUTATION_HEADERS, "Content-Type": "application/json" }, body: "{}",
    });
    const payload = await readPayload<T>(response);
    throwIfRequestFailed(response, payload);
    return payload.data;
  };
  const request = typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("asia-admin-session-refresh", { signal: controller.signal }, restore)
    : restore();
  const pending = request.finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    if (pendingRefresh === pending) pendingRefresh = null;
  });
  pendingRefresh = pending;
  return pending as Promise<T>;
}

async function fetchWithSession(path: string, options: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, options);
  const publicAuth = ["/admin/auth/login", "/admin/auth/logout", "/admin/auth/refresh", "/admin/auth/me"];
  if (response.status !== 401 || !path.startsWith("/admin/") || publicAuth.includes(path)
    || path.startsWith("/admin/auth/register") || path.startsWith("/admin/auth/forgot-password")) return response;
  await refreshApiSession(options.signal ?? undefined);
  return fetch(`${API_URL}${path}`, options);
}

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

export class ApiTimeoutError extends Error {
  constructor() {
    super("Máy chủ phản hồi quá lâu. Vui lòng thử lại.");
    this.name = "ApiTimeoutError";
  }
}

// One deadline covers fetching, reading the body, retries and session refresh.
// The separate rejection also settles the UI when a transport ignores abort.
export function apiGetWithTimeout<T>(path: string, signal?: AbortSignal, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const result = new Promise<T>((resolve, reject) => {
    onAbort = () => {
      const reason = signal?.reason ?? new DOMException("Request aborted", "AbortError");
      reject(reason);
      controller.abort(reason);
    };
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      const error = new ApiTimeoutError();
      reject(error);
      controller.abort(error);
    }, timeoutMs);
    void apiGet<T>(path, controller.signal).then(resolve, reject);
  });
  return result.finally(() => {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  });
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
      const response = await fetchWithSession(path, {
        credentials: "include",
        cache: "no-store",
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

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithSession(path, {
    method: "POST",
    credentials: "include",
    signal,
    headers: { ...MUTATION_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithSession(path, {
    method: "PATCH",
    credentials: "include",
    headers: { ...MUTATION_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}

export async function apiPostFormData<T>(path: string, body: FormData): Promise<T> {
  const response = await fetchWithSession(path, {
    method: "POST",
    headers: MUTATION_HEADERS,
    credentials: "include",
    body,
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}


export async function apiPatchFormData<T>(path: string, body: FormData): Promise<T> {
  const response = await fetchWithSession(path, {
    method: "PATCH",
    headers: MUTATION_HEADERS,
    credentials: "include",
    body,
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetchWithSession(path, {
    method: "DELETE",
    headers: MUTATION_HEADERS,
    credentials: "include",
  });

  const payload = await readPayload<T>(response);
  throwIfRequestFailed(response, payload);
  return payload.data;
}
