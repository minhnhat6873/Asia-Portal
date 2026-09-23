import type { NextFunction, Request, Response } from "express";

import type { RegisterAccountInput } from "../../interfaces/account.interface";
import { userAccountService } from "../../services/user/account.service";

export async function register(
  request: Request<unknown, unknown, RegisterAccountInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await userAccountService.register(request.body);
    response.status(201).json({
      success: true,
      message: "Đăng ký thành công. Tài khoản đang chờ admin phê duyệt.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
}
