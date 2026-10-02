import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";

import {
  type AuthenticatedAccount,
  type LoginInput,
} from "../../interfaces/account.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { permissionGroupRepository } from "../../repositories/admin/permission-group.repository";
import { PERMISSION_ACTIONS } from "../../interfaces/permission-group.interface";
import { AppError } from "../../utils/errors/AppError";

interface RefreshTokenPayload extends JwtPayload {
  tokenType?: "access" | "refresh";
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new AppError(500, "Máy chủ chưa cấu hình JWT_SECRET");
  }
  return secret;
}

function createAccessToken(admin: AuthenticatedAccount): string {
  return jwt.sign(
    { name: admin.name, email: admin.email, role: admin.role, tokenType: "access" },
    getJwtSecret(),
    { subject: admin.id, expiresIn: "10h" },
  );
}

function createRefreshToken(admin: AuthenticatedAccount): string {
  return jwt.sign(
    { tokenType: "refresh" },
    getJwtSecret(),
    { subject: admin.id, expiresIn: "3d" },
  );
}

async function buildActiveAdmin(accountId: string): Promise<AuthenticatedAccount> {
  const account = await adminAccountRepository.findActiveById(accountId);
  if (!account) {
    throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
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

  return {
    id: account._id.toString(),
    name: account.name,
    email: account.email,
    role: account.role,
    permissions,
  };
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

    const admin = await buildActiveAdmin(account._id.toString());
    const token = createAccessToken(admin);
    const refreshToken = data.rememberMe ? createRefreshToken(admin) : undefined;

    return { admin, token, refreshToken };
  },

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, getJwtSecret()) as RefreshTokenPayload;
    } catch {
      throw new AppError(401, "Phiên ghi nhớ đăng nhập đã hết hạn hoặc không hợp lệ");
    }

    if (payload.tokenType !== "refresh" || !payload.sub) {
      throw new AppError(401, "Phiên ghi nhớ đăng nhập không hợp lệ");
    }

    const admin = await buildActiveAdmin(payload.sub);
    return { admin, token: createAccessToken(admin) };
  },
};