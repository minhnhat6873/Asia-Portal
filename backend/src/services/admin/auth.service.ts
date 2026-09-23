import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  type AuthenticatedAccount,
  type LoginInput,
} from "../../interfaces/account.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { permissionGroupRepository } from "../../repositories/admin/permission-group.repository";
import { PERMISSION_ACTIONS } from "../../interfaces/permission-group.interface";
import { AppError } from "../../utils/errors/AppError";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new AppError(500, "Máy chủ chưa cấu hình JWT_SECRET");
  }
  return secret;
}

export const adminAuthService = {
  async login(data: LoginInput) {
    const account = await adminAccountRepository.findByEmailWithPassword(data.email);
    if (!account) {
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }

    const passwordMatches = await bcrypt.compare(data.password, account.password);
    if (!passwordMatches) {
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }

    if (account.status === "pending") {
      throw new AppError(403, "Tài khoản đang chờ admin phê duyệt");
    }

    if (account.status !== "active") {
      throw new AppError(403, "Tài khoản đã bị khóa");
    }

    if (account.role === "user") {
      throw new AppError(403, "Tài khoản chưa được cấp quyền vào trang quản trị");
    }

    const groups = await permissionGroupRepository.findActiveByIds(
      (account.permissionGroupIds ?? []).map((id: unknown) => String(id)),
    );
    const permissions = account.role === "admin"
      ? [...PERMISSION_ACTIONS]
      : [...new Set(groups.flatMap((group) => group.actions))];
    const admin: AuthenticatedAccount = {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      role: account.role,
      permissions,
    };

    const token = jwt.sign(
      {
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      getJwtSecret(),
      {
        subject: admin.id,
        expiresIn: "8h",
      },
    );

    return { admin, token };
  },
};
