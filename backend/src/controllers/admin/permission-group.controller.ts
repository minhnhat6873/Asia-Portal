import type { NextFunction, Request, Response } from "express";

import type {
  CreatePermissionGroupInput,
  UpdatePermissionGroupInput,
} from "../../interfaces/permission-group.interface";
import { permissionGroupService } from "../../services/admin/permission-group.service";
import { PERMISSION_CATALOG, PERMISSION_MODULES } from "../../config/permission-catalog";
import { auditLogService } from "../../services/admin/audit-log.service";

export async function deleteGroup(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await permissionGroupService.deleteGroup(request.params.id);
    const admin = request.admin!;
    await auditLogService.record({
      actor: { accountId: admin.id, name: admin.name, email: admin.email },
      action: "permission_group.deleted", entityType: "permission_group", entityId: deleted.id,
      description: `Xóa nhóm quyền ${deleted.name}`,
    });
    response.status(200).json({ success: true, message: "Đã xóa nhóm quyền.", data: { id: deleted.id } });
  } catch (error) { next(error); }
}

export function getPermissionCatalog(_request: Request, response: Response): void {
  response.json({ success: true, data: { modules: PERMISSION_MODULES, permissions: PERMISSION_CATALOG } });
}

export async function getGroups(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groups = await permissionGroupService.getGroups();
    response.status(200).json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
}

export async function createGroup(
  request: Request<unknown, unknown, CreatePermissionGroupInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const group = await permissionGroupService.createGroup(request.body);
    response.status(201).json({
      success: true,
      message: "Đã tạo nhóm quyền",
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGroup(
  request: Request<{ id: string }, unknown, UpdatePermissionGroupInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const group = await permissionGroupService.updateGroup(
      request.params.id,
      request.body,
    );
    response.status(200).json({
      success: true,
      message: "Đã cập nhật nhóm quyền",
      data: group,
    });
  } catch (error) {
    next(error);
  }
}
