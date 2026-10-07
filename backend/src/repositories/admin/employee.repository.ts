import type { QueryFilter, SortOrder } from "mongoose";

import type {
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
} from "../../interfaces/employee.interface";
import EmployeeModel from "../../models/employee.model";

interface FindEmployeesOptions {
  filter: QueryFilter<Employee>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

export const adminEmployeeRepository = {
  create(data: CreateEmployeeInput) {
    return EmployeeModel.create(data);
  },

  findAll({ filter, skip, limit, sort }: FindEmployeesOptions) {
    return EmployeeModel.find(filter).sort(sort).skip(skip).limit(limit).lean();
  },

  count(filter: QueryFilter<Employee>) {
    return EmployeeModel.countDocuments(filter);
  },

  async countDistinctDepartments(filter: QueryFilter<Employee>) {
    const departments = await EmployeeModel.distinct("department", filter);
    return departments.filter((department) => typeof department === "string" && department.trim()).length;
  },

  findById(id: string) {
    return EmployeeModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
  },

  findByEmail(email: string) {
    return EmployeeModel.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } }).lean();
  },

  findByEmployeeCode(employeeCode: string) {
    return EmployeeModel.findOne({
      employeeCode: employeeCode.toUpperCase(),
      isDeleted: { $ne: true },
    }).lean();
  },

  updateById(id: string, data: UpdateEmployeeInput) {
    return EmployeeModel.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, data, {
      new: true,
      runValidators: true,
    }).lean();
  },

  softDeleteById(id: string, deletedBy: Employee["deletedBy"]) {
    return EmployeeModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date(), deletedBy },
      { new: true, runValidators: true },
    ).lean();
  },

  restoreById(id: string) {
    return EmployeeModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null }, $unset: { deletedBy: 1 } },
      { new: true, runValidators: true },
    ).lean();
  },

  permanentlyDeleteById(id: string) {
    return EmployeeModel.findOneAndDelete({ _id: id, isDeleted: true }).lean();
  },
};
