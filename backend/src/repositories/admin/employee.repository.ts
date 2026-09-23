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

  findById(id: string) {
    return EmployeeModel.findById(id).lean();
  },

  findByEmail(email: string) {
    return EmployeeModel.findOne({ email: email.toLowerCase() }).lean();
  },

  findByEmployeeCode(employeeCode: string) {
    return EmployeeModel.findOne({
      employeeCode: employeeCode.toUpperCase(),
    }).lean();
  },

  updateById(id: string, data: UpdateEmployeeInput) {
    return EmployeeModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  },
};
