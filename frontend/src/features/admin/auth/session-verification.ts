import type { AuthenticatedAdmin } from "../login/auth.service";

export const SESSION_VERIFICATION_TIMEOUT_MS = 15_000;

export class SessionVerificationTimeoutError extends Error {
  constructor() {
    super("Máy chủ phản hồi quá lâu khi kiểm tra đăng nhập. Vui lòng thử lại.");
    this.name = "SessionVerificationTimeoutError";
  }
}

export function createSessionVerifier({ getCurrentAdmin, refreshAdminSession, isUnauthorized, timeoutMs = SESSION_VERIFICATION_TIMEOUT_MS }: {
  getCurrentAdmin: (signal: AbortSignal) => Promise<AuthenticatedAdmin>;
  refreshAdminSession: (signal: AbortSignal) => Promise<AuthenticatedAdmin>;
  isUnauthorized: (error: unknown) => boolean;
  timeoutMs?: number;
}) {
  let pending: Promise<AuthenticatedAdmin> | null = null;

  return function verifySession(): Promise<AuthenticatedAdmin> {
    if (pending) return pending;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new SessionVerificationTimeoutError());
        controller.abort();
      }, timeoutMs);
    });
    const request = (async () => {
      try {
        return await getCurrentAdmin(controller.signal);
      } catch (error) {
        if (!controller.signal.aborted && isUnauthorized(error)) {
          return refreshAdminSession(controller.signal);
        }
        throw error;
      }
    })();
    const verification = Promise.race([request, timeout]).finally(() => {
      clearTimeout(timer);
      if (pending === verification) pending = null;
    });
    pending = verification;
    return verification;
  };
}
