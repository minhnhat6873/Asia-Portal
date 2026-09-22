import bcrypt from "bcryptjs";
import { model, models, Schema } from "mongoose";

import {
  ADMIN_ROLES,
  ADMIN_STATUSES,
  type AdminAccount,
} from "../interfaces/admin.interface";

const adminSchema = new Schema<AdminAccount>(
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
      enum: ADMIN_ROLES,
      required: true,
      default: "manager",
    },
    status: {
      type: String,
      enum: ADMIN_STATUSES,
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

adminSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

const AdminModel = models.Admin || model<AdminAccount>("Admin", adminSchema);

export default AdminModel;