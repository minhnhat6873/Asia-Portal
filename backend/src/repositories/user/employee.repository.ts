import type { QueryFilter, SortOrder } from "mongoose";

import type { Employee } from "../../interfaces/employee.interface";
import EmployeeModel from "../../models/employee.model";

interface FindEmployeesOptions {
  filter: QueryFilter<Employee>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

export const userEmployeeRepository = {
  findAll({ filter, skip, limit, sort }: FindEmployeesOptions) {
    return EmployeeModel.find(filter)
      .select("-birthDate -createdBy -avatarPublicId")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  count(filter: QueryFilter<Employee>) {
    return EmployeeModel.countDocuments(filter);
  },

  findById(id: string) {
    return EmployeeModel.findOne({ _id: id, isDeleted: { $ne: true } })
      .select("-birthDate -createdBy -avatarPublicId")
      .lean();
  },
};
