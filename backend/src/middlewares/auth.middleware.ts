import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import { AUTH_COOKIE_NAME } from "../config/auth.config";
import {
  type AccountRole,
} from "../interfaces/account.interface";
import { adminAccountRepository } from "../repositories/admin/account.repository";
import { permissionGroupRepository } from "../repositories/admin/permission-group.repository";
import {
  PERMISSION_ACTIONS,
  type PermissionAction,
} from "../interfaces/permission-group.interface";

interface AdminTokenPayload extends JwtPayload {
  name?: string;
  email?: string;
  role?: AccountRole;
}

export async function requireAdminAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = request.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    const secret = process.env.JWT_SECRET?.trim();

    if (!token || !secret) {
      response.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để tiếp tục",
      });
      return;
    }

    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    if (!payload.sub || !mongoose.isValidObjectId(payload.sub)) {
      response.status(401).json({
        success: false,
        message: "Phiên đăng nhập không hợp lệ",
      });
      return;
    }

    const account = await adminAccountRepository.findActiveById(payload.sub);
    if (!account) {
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
      : [...new Set(groups.flatMap((group) => group.actions))];

    request.admin = {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      role: account.role,
      permissions,
    };

    next();
  } catch {
    response.status(401).json({
      success: false,
      message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ",
    });
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
  const permission: PermissionAction = request.body?.status === "inactive"
    ? "employees:deactivate"
    : "employees:update";

  requirePermissions(permission)(request, response, next);
}
