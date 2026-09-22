import { model, models, Schema } from "mongoose";

import {
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
    joinDate: { type: Date, required: true },
    status: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      default: "active",
      index: true,
    },
    description: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

employeeSchema.index({ name: "text", employeeCode: "text", email: "text" });

const EmployeeModel =
  models.Employee || model<Employee>("Employee", employeeSchema);

export default EmployeeModel;