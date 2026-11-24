import type { NextFunction, Request, Response } from "express";

import type {
  CreateAdminAccountInput,
  ResetAccountPasswordInput,
  UpdateAdminAccountInput,
} from "../../interfaces/account.interface";
import type { AuditAction } from "../../interfaces/audit-log.interface";
import { adminAccountService } from "../../services/admin/account.service";
import { auditLogService } from "../../services/admin/audit-log.service";
import { accountContactService, type AccountContactInput } from "../../services/account-contact.service";

export async function checkAccountContacts(request: Request<unknown, unknown, AccountContactInput>, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: await accountContactService.check(request.body) });
  } catch (error) { next(error); }
}

export async function getAccounts(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const accounts = await adminAccountService.getAccounts(request.admin!);
    response.status(200).json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
}

export async function lookupEmployees(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const query = typeof request.query.q === "string" ? request.query.q : "";
    response.json({ success: true, data: await adminAccountService.lookupEmployees(query) });
  } catch (error) { next(error); }
}

export async function createAccount(
  request: Request<unknown, unknown, CreateAdminAccountInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await adminAccountService.createAccount(request.body, request.admin!.id);
    await auditLogService.record({
      actor: { accountId: request.admin!.id, name: request.admin!.name, email: request.admin!.email },
      action: "account.created", entityType: "account", entityId: account.id,
      description: `Tạo tài khoản ${account.name} (${account.email}), loại ${account.role}`,
    });
    response.status(201).json({
      success: true,
      message: "Đã tạo tài khoản",
      data: account,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(
  request: Request<{ id: string }, unknown, UpdateAdminAccountInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await adminAccountService.updateAccount(
      request.params.id,
      request.body,
      request.admin!.id,
    );
    await auditLogService.record({
      actor: { accountId: request.admin!.id, name: request.admin!.name, email: request.admin!.email },
      action: "account.updated", entityType: "account", entityId: account.id,
      description: `Cập nhật tài khoản ${account.name} (${account.email}): ${Object.keys(request.body).join(", ")}`,
    });
    response.status(200).json({
      success: true,
      message: "Đã cập nhật tài khoản",
      data: account,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  request: Request<{ id: string }, unknown, ResetAccountPasswordInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adminAccountService.resetPassword(request.params.id, request.body, request.admin!.id);
    await auditLogService.record({
      actor: { accountId: request.admin!.id, name: request.admin!.name, email: request.admin!.email },
      action: "account.password_reset", entityType: "account", entityId: request.params.id,
      description: "Quản trị viên đặt lại mật khẩu tài khoản.",
    });
    response.status(200).json({
      success: true,
      message: "Đã đặt lại mật khẩu tài khoản",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(
  request: Request<{ id: string }>, response: Response, next: NextFunction,
): Promise<void> {
  try {
    const admin = request.admin!;
    const deleted = await adminAccountService.deleteAccount(request.params.id, admin.id);
    await auditLogService.record({
      actor: { accountId: admin.id, name: admin.name, email: admin.email },
      action: "account.soft_deleted", entityType: "account", entityId: deleted.id,
      description: `Chuyển tài khoản ${deleted.name} (${deleted.email}) vào thùng rác`,
    });
    response.status(200).json({ success: true, message: "Đã chuyển tài khoản vào thùng rác.", data: { id: deleted.id } });
  } catch (error) { next(error); }
}

type AccountAction = (id: string, actorId: string) => Promise<{ id: string; name: string; email: string }>;

// Shared shape for lock/unlock/restore/permanent delete: run, audit, answer.
function accountAction(run: (request: Request<{ id: string }>) => ReturnType<AccountAction>, action: AuditAction, describe: (name: string, email: string, request: Request<{ id: string }>) => string, message: string) {
  return async (request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = request.admin!;
      const account = await run(request);
      await auditLogService.record({
        actor: { accountId: admin.id, name: admin.name, email: admin.email },
        action, entityType: "account", entityId: account.id,
        description: describe(account.name, account.email, request),
      });
      response.status(200).json({ success: true, message, data: account });
    } catch (error) { next(error); }
  };
}

export const lockAccount = accountAction(
  (request) => adminAccountService.lockAccount(request.params.id, (request.body as { reason?: string }).reason ?? "", request.admin!.id),
  "account.locked",
  (name, email, request) => {
    const reason = ((request.body as { reason?: string }).reason ?? "").trim();
    return `Khóa tài khoản ${name} (${email})${reason ? `. Lý do: ${reason}` : ""}`;
  },
  "Đã khóa tài khoản. Người dùng đã bị đăng xuất khỏi mọi thiết bị.",
);
export const unlockAccount = accountAction(
  (request) => adminAccountService.unlockAccount(request.params.id, request.admin!.id),
  "account.unlocked", (name, email) => `Mở khóa tài khoản ${name} (${email})`, "Đã mở khóa tài khoản.",
);
export const restoreAccount = accountAction(
  (request) => adminAccountService.restoreAccount(request.params.id, request.admin!.id),
  "account.restored", (name, email) => `Khôi phục tài khoản ${name} (${email}) từ thùng rác`,
  "Đã khôi phục tài khoản. Tài khoản đang bị khóa, hãy mở khóa khi cần dùng lại.",
);
export const permanentlyDeleteAccount = accountAction(
  (request) => adminAccountService.permanentlyDeleteAccount(request.params.id, request.admin!.id),
  "account.permanently_deleted", (name, email) => `Xóa vĩnh viễn tài khoản ${name} (${email})`, "Đã xóa vĩnh viễn tài khoản.",
);

export async function getDeletedAccounts(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: await adminAccountService.getDeletedAccounts(request.admin!) });
  } catch (error) { next(error); }
}
