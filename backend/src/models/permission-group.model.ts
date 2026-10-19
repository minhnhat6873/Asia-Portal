import { model, models, Schema } from "mongoose";

import {
  PERMISSION_ACTIONS,
  PERMISSION_GROUP_STATUSES,
  PERMISSION_GROUP_COLORS,
  PERMISSION_GROUP_ICONS,
  type PermissionGroup,
} from "../interfaces/permission-group.interface";

const permissionGroupSchema = new Schema<PermissionGroup>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    description: { type: String, trim: true, default: "", maxlength: 500 },
    color: { type: String, enum: PERMISSION_GROUP_COLORS, default: "emerald" },
    icon: { type: String, enum: PERMISSION_GROUP_ICONS, default: "shield" },
    actions: {
      type: [String],
      enum: PERMISSION_ACTIONS,
      required: true,
      default: [],
    },
    status: {
      type: String,
      enum: PERMISSION_GROUP_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const PermissionGroupModel =
  models.PermissionGroup ||
  model<PermissionGroup>("PermissionGroup", permissionGroupSchema);

export default PermissionGroupModel;
