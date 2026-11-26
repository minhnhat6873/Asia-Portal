import type { AccountLock } from "@/services/access-control.service";

// One line under "Tạm khóa" saying why the account is locked.
export function describeLock(lock: AccountLock | null | undefined): string {
  if (!lock) return "";
  if (lock.kind === "employee-left") return "Nhân viên nghỉ việc";
  if (lock.kind === "employee-deleted") return "Hồ sơ nhân viên đã bị xóa";
  if (lock.kind === "login-failed") return "Nhập sai mật khẩu quá nhiều lần";
  if (lock.kind === "restored") return `Khôi phục từ thùng rác${lock.byName ? ` bởi ${lock.byName}` : ""}, chờ mở khóa`;
  return `Khóa bởi ${lock.byName ?? "quản trị viên"}${lock.note ? ` · “${lock.note}”` : ""}`;
}

// Locked because of the employee record: unlocking needs an extra confirmation.
export function isEmployeeLock(lock: AccountLock | null | undefined): boolean {
  return lock?.kind === "employee-left" || lock?.kind === "employee-deleted";
}
