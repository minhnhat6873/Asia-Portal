import bcrypt from "bcryptjs";
import { model, models, Schema } from "mongoose";

import {
  ACCOUNT_ROLES,
  ACCOUNT_STATUSES,
  type Account,
} from "../interfaces/account.interface";

const accountSchema = new Schema<Account>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ACCOUNT_ROLES,
      required: true,
      default: "user",
    },
    status: {
      type: String,
      enum: ACCOUNT_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    permissionGroupIds: {
      type: [Schema.Types.ObjectId],
      ref: "PermissionGroup",
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

accountSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Giữ nguyên tên model để tiếp tục dùng collection MongoDB `admins` hiện có.
const AccountModel = models.Admin || model<Account>("Admin", accountSchema);

export default AccountModel;
