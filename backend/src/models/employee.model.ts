import { model, models, Schema } from "mongoose";

import {
  EMPLOYEE_GENDERS,
  EMPLOYEE_RANKS,
  EMPLOYEE_STATUSES,
  type Employee,
} from "../interfaces/employee.interface";

const employeeSchema = new Schema<Employee>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    position: { type: String, required: true, trim: true, index: true },
    department: { type: String, required: true, trim: true, index: true },
    rank: { type: String, enum: EMPLOYEE_RANKS, trim: true, default: "" },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    avatar: { type: String, default: "", trim: true },
    avatarPublicId: { type: String, default: "", trim: true },
    chartAvatar: { type: String, default: "", trim: true },
    chartAvatarPublicId: { type: String, default: "", trim: true },
    joinDate: { type: Date, required: true },
    birthDate: { type: Date },
    gender: { type: String, enum: EMPLOYEE_GENDERS },
    status: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      default: "active",
      index: true,
    },
    description: { type: String, trim: true, default: "" },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      accountId: { type: String, trim: true },
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      _id: false,
    },
    createdBy: {
      accountId: { type: String, trim: true },
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      _id: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

employeeSchema.index({ name: "text", employeeCode: "text", email: "text" });
employeeSchema.index(
  { rank: 1 },
  {
    name: "unique_active_employee_ceo",
    unique: true,
    partialFilterExpression: { rank: "CEO", isDeleted: false },
  },
);

const EmployeeModel =
  models.Employee || model<Employee>("Employee", employeeSchema);

export default EmployeeModel;
