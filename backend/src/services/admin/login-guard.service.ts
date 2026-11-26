import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { AppError } from "../../utils/errors/AppError";

/**
 * Wrong passwords, per account (both portals):
 *   5 wrong -> wait 10 minutes, 5 more -> wait 30 minutes, 5 more -> the account is locked
 *   (like the lock button). Only an admin unlocks it; an Admin gốc may also unlock their own
 *   account by setting a new password through "Quên mật khẩu" (nobody else could unlock it).
 *   A correct password, or 24 hours without a wrong one, starts over.
 */
export const LOGIN_FAILS_PER_ROUND = 5;
export const LOGIN_WAIT_MINUTES = [10, 30] as const;
export const LOGIN_GUARD_RESET_MS = 24 * 60 * 60_000;

/**
 * TẠM ĐỂ TEST: LOGIN_TEST_LOCK_ON_FIRST_FAIL=true in backend/.env locks an account on its first
 * wrong password, to try the lock and unlock quickly. Never set it on the server.
 */
export const lockOnFirstFailForTesting = () => process.env.LOGIN_TEST_LOCK_ON_FIRST_FAIL?.trim().toLowerCase() === "true";

export const INVALID_LOGIN ="Tên đăng nhập hoặc mật khẩu không chính xác.";
export const LOCKED_BY_FAILURES = "Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng liên hệ quản trị viên để mở khóa.";
export const ADMIN_LOCKED_BY_FAILURES = "Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần. Bấm \"Quên mật khẩu\" để đặt mật khẩu mới và mở khóa.";

export const invalidLogin = () => new AppError(401, INVALID_LOGIN);
export const lockedByFailures = (role?: string) => new AppError(403, role === "admin" ? ADMIN_LOCKED_BY_FAILURES : LOCKED_BY_FAILURES);
export function waitError(until: Date, now = new Date()): AppError {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
  return new AppError(429, `Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${minutes} phút.`);
}

type GuardedAccount = { _id: unknown; role?: string; status: string; lock?: { kind: string } | null; loginGuard?: { waitUntil?: Date | null } | null };

export const loginGuardService = {
  /** Before checking the password: a locked or waiting account is refused without trying it. */
  assertMayTry(account: GuardedAccount, now = new Date()): void {
    if (account.status === "inactive" && account.lock?.kind === "login-failed") throw lockedByFailures(account.role);
    const until = account.loginGuard?.waitUntil;
    if (until && until > now) throw waitError(until, now);
  },

  /** Records a wrong password; always throws the error to show. */
  async recordFailure(account: GuardedAccount, now = new Date()): Promise<never> {
    // Only active accounts count: a locked or pending one keeps its own state.
    if (account.status !== "active") throw invalidLogin();
    if (lockOnFirstFailForTesting()) {
      await adminAccountRepository.lockForLoginFailures(account._id, now);
      throw lockedByFailures(account.role);
    }
    await adminAccountRepository.resetStaleLoginGuard(account._id, new Date(now.getTime() - LOGIN_GUARD_RESET_MS));
    const after = await adminAccountRepository.addLoginFailure(account._id, now);
    const count = after?.loginGuard?.count ?? 0;
    const level = after?.loginGuard?.level ?? 0;
    if (count < LOGIN_FAILS_PER_ROUND) {
      // Last round: warn before the lock. Earlier rounds stay quiet (no hint that the username exists).
      if (level >= LOGIN_WAIT_MINUTES.length) {
        throw new AppError(401, `${INVALID_LOGIN} Còn ${LOGIN_FAILS_PER_ROUND - count} lần thử trước khi tài khoản bị khóa.`);
      }
      throw invalidLogin();
    }
    const closed = await adminAccountRepository.closeLoginRound(account._id, LOGIN_FAILS_PER_ROUND);
    if (!closed) throw invalidLogin(); // A parallel request closed this round.
    const round = closed.loginGuard?.level ?? 1;
    if (round > LOGIN_WAIT_MINUTES.length) {
      await adminAccountRepository.lockForLoginFailures(account._id, now);
      throw lockedByFailures(account.role);
    }
    const until = new Date(now.getTime() + LOGIN_WAIT_MINUTES[round - 1]! * 60_000);
    await adminAccountRepository.setLoginWait(account._id, until);
    throw waitError(until, now);
  },

  /** Correct password: start over. */
  async clear(account: GuardedAccount & { loginGuard?: { count?: number; level?: number; waitUntil?: Date | null } | null }): Promise<void> {
    if (account.loginGuard) await adminAccountRepository.clearLoginGuard(account._id);
  },
};
