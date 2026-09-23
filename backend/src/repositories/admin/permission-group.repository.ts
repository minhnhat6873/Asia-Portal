import type {
  CreatePermissionGroupInput,
  UpdatePermissionGroupInput,
} from "../../interfaces/permission-group.interface";
import PermissionGroupModel from "../../models/permission-group.model";

export const permissionGroupRepository = {
  findAll() {
    return PermissionGroupModel.find({}).sort({ name: 1 }).lean();
  },

  findByName(name: string) {
    return PermissionGroupModel.findOne({ name }).lean();
  },

  findActiveByIds(ids: string[]) {
    return PermissionGroupModel.find({
      _id: { $in: ids },
      status: "active",
    }).lean();
  },

  findById(id: string) {
    return PermissionGroupModel.findById(id).lean();
  },

  create(data: CreatePermissionGroupInput) {
    return PermissionGroupModel.create(data);
  },

  updateById(id: string, data: UpdatePermissionGroupInput) {
    return PermissionGroupModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  },
};
