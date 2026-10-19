import type { NextFunction, Request, Response } from "express";

import type {
  CreateAdminAccountInput,
  ResetAccountPasswordInput,
  UpdateAdminAccountInput,
} from "../../interfaces/account.interface";
import { adminAccountService } from "../../services/admin/account.service";
import { auditLogService } from "../../services/admin/audit-log.service";
import { accountContactService, type AccountContactInput } from "../../services/account-contact.service";

export async function checkAccountContacts(request: Request<unknown, unknown, AccountContactInput>, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: await accountContactService.check(request.body) });
  } catch (error) { next(error); }
}

export async function getAccounts(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const accounts = await adminAccountService.getAccounts();
    response.status(200).json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
}

export async function createAccount(
  request: Request<unknown, unknown, CreateAdminAccountInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await adminAccountService.createAccount(request.body, request.admin!.id);
    response.status(201).json({
      success: true,
      message: "Đã tạo tài khoản quản trị",
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
    await adminAccountService.resetPassword(request.params.id, request.body, request.admin!.id);
    response.status(200).json({
      success: true,
      message: "Đã đặt lại mật khẩu tài khoản",
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
      action: "account.deleted", entityType: "account", entityId: deleted.id,
      description: `Xóa tài khoản ${deleted.name} (${deleted.email})`,
    });
    response.status(200).json({ success: true, message: "Đã xóa tài khoản.", data: { id: deleted.id } });
  } catch (error) { next(error); }
}
