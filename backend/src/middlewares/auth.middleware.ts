import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import { deleteCloudinaryAsset } from "../helpers/multerCloudinary.helper";
import { AUTH_COOKIE_NAME } from "../config/auth.config";
import { authSessionRepository } from "../repositories/admin/auth-session.repository";
import { normalizeSessionIp } from "../utils/account/sessionClient";
import { AppError } from "../utils/errors/AppError";
import {
  type AccountRole,
} from "../interfaces/account.interface";
import { adminAccountRepository } from "../repositories/admin/account.repository";
import { permissionGroupRepository } from "../repositories/admin/permission-group.repository";
import {
  PERMISSION_ACTIONS,
  filterPermissionActions,
  type PermissionAction,
} from "../interfaces/permission-group.interface";

interface AdminTokenPayload extends JwtPayload {
  name?: string;
  email?: string;
  role?: AccountRole;
  tokenType?: "access" | "refresh";
  sid?: string;
  version?: number;
}

export async function requireAdminAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const token = request.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  const secret = process.env.JWT_SECRET?.trim();

  if (!token) {
    response.status(401).json({
      success: false,
      message: "Bạn cần đăng nhập để tiếp tục",
    });
    return;
  }
  if (!secret) {
    next(new AppError(500, "Máy chủ chưa cấu hình xác thực."));
    return;
  }

  let payload: AdminTokenPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as AdminTokenPayload;
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) {
      next(error);
      return;
    }
    response.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ" });
    return;
  }
  if (!payload || typeof payload !== "object" || payload.tokenType !== "access" || typeof payload.sid !== "string" || !payload.sid || !Number.isInteger(payload.version) || typeof payload.sub !== "string" || !mongoose.isValidObjectId(payload.sub)) {
    response.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ",
    });
    return;
  }

  try {
    const account = await adminAccountRepository.findActiveById(payload.sub);
    const session = await authSessionRepository.findActive(payload.sid, payload.sub);
    if (!account || !session || session.authVersion !== (account.authVersion ?? 0) || payload.version !== session.authVersion) {
      response.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại hoặc đã bị khóa",
      });
      return;
    }

    if (account.role === "user") {
      response.status(403).json({
        success: false,
        message: "Tài khoản chưa được cấp quyền vào trang quản trị",
      });
      return;
    }

    const groups = await permissionGroupRepository.findActiveByIds(
      (account.permissionGroupIds ?? []).map((id: unknown) => String(id)),
    );
    const permissions = account.role === "admin"
      ? [...PERMISSION_ACTIONS]
      : filterPermissionActions(groups.flatMap((group) => group.actions));

    request.admin = {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      phone: account.phone,
      status: account.status,
      role: account.role,
      permissions,
    };

    request.adminSessionId = payload.sid;
    const lastSeen = session.lastSeenAt ?? session.createdAt;
    if (lastSeen && Date.now() - new Date(lastSeen).getTime() >= 60_000) {
      // Metadata is best-effort; a failure must not bypass auth or block users.
      void authSessionRepository.touch(payload.sid, payload.sub, normalizeSessionIp(request.ip))
        .catch(() => undefined);
    }
    next();
  } catch (error) {
    // A failed lookup is not evidence that the session is invalid. Do not
    // authorize the request or clear cookies while the database is unavailable.
    next(error);
  }
}

export function requireAdminRole(...roles: AccountRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.admin || !roles.includes(request.admin.role)) {
      response.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này",
      });
      return;
    }

    next();
  };
}

export function requirePermissions(...permissions: PermissionAction[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const account = request.admin;
    if (!account || !permissions.every((permission) => account.permissions.includes(permission))) {
      response.status(403).json({
        success: false,
        message: "Tài khoản chưa được cấp quyền thực hiện thao tác này",
      });
      return;
    }

    next();
  };
}

export function requireEmployeeUpdatePermission(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  requirePermissions("employees:update")(request, response, next);
}

export function requireMediaUpdatePermission(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const fields = Object.keys(request.body ?? {});
  const permissions: PermissionAction[] = [];
  if (fields.includes("status")) permissions.push("media:publish");
  if (fields.some((field) => field !== "status") || request.file || !fields.length) permissions.push("media:update");
  enforceMediaPermissions(request, response, next, permissions);
}

export function requireAnyPermission(...permissions: PermissionAction[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.admin || !permissions.some((permission) => request.admin!.permissions.includes(permission))) {
      response.status(403).json({ success: false, message: "Tài khoản chưa được cấp quyền thực hiện thao tác này" });
      return;
    }
    next();
  };
}

export function requireMediaCreatePermission(request: Request, response: Response, next: NextFunction): void {
  const permissions: PermissionAction[] = request.body?.status === "published" ? ["media:create", "media:publish"] : ["media:create"];
  enforceMediaPermissions(request, response, next, permissions);
}

function enforceMediaPermissions(request: Request, response: Response, next: NextFunction, permissions: PermissionAction[]): void {
  const rejectOrProceed = () => requirePermissions(...permissions)(request, response, next);
  if (request.file?.filename && !permissions.every((permission) => request.admin?.permissions.includes(permission))) {
    void deleteCloudinaryAsset(request.file.filename).catch(() => undefined).finally(rejectOrProceed);
    return;
  }
  rejectOrProceed();
}
