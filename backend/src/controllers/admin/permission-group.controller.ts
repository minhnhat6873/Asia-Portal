import type { NextFunction, Request, Response } from "express";

import type {
  CreatePermissionGroupInput,
  UpdatePermissionGroupInput,
} from "../../interfaces/permission-group.interface";
import { permissionGroupService } from "../../services/admin/permission-group.service";

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
