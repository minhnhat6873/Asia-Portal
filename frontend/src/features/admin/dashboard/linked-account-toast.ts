import { toast } from "sonner";

// What the backend did to the login linked to an employee (data.linkedAccount).
export type LinkedAccountOutcome = "none" | "locked" | "trashed" | "admin-skipped";
// "left": set to Đã nghỉ việc; "deleted": moved to the employee trash; "purged": deleted for good.
export type EmployeeExit = "left" | "deleted" | "purged";

const ADMIN_SKIPPED = "Nhân viên này có tài khoản Admin gốc nên tài khoản không bị khóa tự động. Nếu nhân viên đã nghỉ, hãy vào Phân quyền quản lý để khóa.";
const DONE: Record<EmployeeExit, string> = {
  left: "Tài khoản đăng nhập đã bị khóa vì nhân viên nghỉ việc.",
  deleted: "Tài khoản đăng nhập của nhân viên đã bị khóa.",
  purged: "Tài khoản đăng nhập đã được chuyển vào thùng rác tài khoản.",
};

export function linkedAccountNote(outcome: LinkedAccountOutcome | undefined, exit: EmployeeExit): string | undefined {
  if (outcome === "admin-skipped") return ADMIN_SKIPPED;
  return outcome === "locked" || outcome === "trashed" ? DONE[exit] : undefined;
}

// Separate notice when the page already shows its own success toast (the employee form).
export function toastLinkedAccount(outcome: LinkedAccountOutcome | undefined, exit: EmployeeExit): void {
  if (outcome === "admin-skipped") toast.warning("Tài khoản Admin gốc không bị khóa tự động", { description: ADMIN_SKIPPED, duration: 12_000 });
  else if (outcome === "locked" || outcome === "trashed") toast.success(DONE[exit]);
}

// Success toast for an employee action, with one line about the login account.
// An Admin gốc account is left untouched, so that case is a longer-lived warning.
export function toastEmployeeChange(title: string, outcome: LinkedAccountOutcome | undefined, exit: EmployeeExit): void {
  const description = linkedAccountNote(outcome, exit);
  if (outcome === "admin-skipped") toast.warning(title, { description, duration: 12_000 });
  else toast.success(title, description ? { description } : undefined);
}
