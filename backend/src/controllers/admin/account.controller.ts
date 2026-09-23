import type { NextFunction, Request, Response } from "express";

import type {
  CreateAdminAccountInput,
  ResetAccountPasswordInput,
  UpdateAdminAccountInput,
} from "../../interfaces/account.interface";
import { adminAccountService } from "../../services/admin/account.service";

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
    const account = await adminAccountService.createAccount(request.body);
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
    await adminAccountService.resetPassword(request.params.id, request.body);
    response.status(200).json({
      success: true,
      message: "Đã đặt lại mật khẩu tài khoản",
    });
  } catch (error) {
    next(error);
  }
}
