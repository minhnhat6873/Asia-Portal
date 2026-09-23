import mongoose from "mongoose";

import type {
  CreatePermissionGroupInput,
  PermissionGroup,
  PermissionGroupResponse,
  UpdatePermissionGroupInput,
} from "../../interfaces/permission-group.interface";
import { permissionGroupRepository } from "../../repositories/admin/permission-group.repository";
import { AppError } from "../../utils/errors/AppError";

type StoredPermissionGroup = PermissionGroup & { _id: unknown };

function toResponse(group: StoredPermissionGroup): PermissionGroupResponse {
  return {
    id: String(group._id),
    name: group.name,
    actions: group.actions,
    status: group.status,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã nhóm quyền không hợp lệ");
  }
}

export const permissionGroupService = {
  async getGroups(): Promise<PermissionGroupResponse[]> {
    const groups = await permissionGroupRepository.findAll();
    return groups.map((group) => toResponse(group));
  },

  async createGroup(
    data: CreatePermissionGroupInput,
  ): Promise<PermissionGroupResponse> {
    const existingGroup = await permissionGroupRepository.findByName(data.name);
    if (existingGroup) {
      throw new AppError(409, "Tên nhóm quyền đã tồn tại");
    }

    const group = await permissionGroupRepository.create({
      ...data,
      actions: [...new Set(data.actions)],
    });
    return toResponse(group.toObject());
  },

  async updateGroup(
    id: string,
    data: UpdatePermissionGroupInput,
  ): Promise<PermissionGroupResponse> {
    ensureValidId(id);

    if (data.name) {
      const existingGroup = await permissionGroupRepository.findByName(data.name);
      if (existingGroup && String(existingGroup._id) !== id) {
        throw new AppError(409, "Tên nhóm quyền đã tồn tại");
      }
    }

    const group = await permissionGroupRepository.updateById(id, {
      ...data,
      actions: data.actions ? [...new Set(data.actions)] : undefined,
    });
    if (!group) throw new AppError(404, "Không tìm thấy nhóm quyền");
    return toResponse(group);
  },
};
