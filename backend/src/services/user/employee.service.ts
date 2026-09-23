import mongoose, { type QueryFilter } from "mongoose";

import type {
  Employee,
  EmployeeListQuery,
} from "../../interfaces/employee.interface";
import { userEmployeeRepository } from "../../repositories/user/employee.repository";
import { AppError } from "../../utils/errors/AppError";
import { escapeRegex } from "../../utils/regex/escapeRegex";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã nhân viên không hợp lệ");
  }
}

export const userEmployeeService = {
  async getEmployees(query: EmployeeListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Employee> = { status: "active" };

    if (query.search?.trim()) {
      const keyword = new RegExp(escapeRegex(query.search.trim()), "i");
      filter.$or = [
        { name: keyword },
        { employeeCode: keyword },
        { email: keyword },
        { phone: keyword },
        { department: keyword },
        { position: keyword },
      ];
    }

    if (query.department) filter.department = query.department;
    if (query.position) filter.position = query.position;

    const sortDirection = query.sort === "oldest" ? 1 : -1;
    const [items, total] = await Promise.all([
      userEmployeeRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit,
        sort: { joinDate: sortDirection },
      }),
      userEmployeeRepository.count(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getEmployeeById(id: string) {
    ensureValidId(id);
    const employee = await userEmployeeRepository.findById(id);
    if (!employee || employee.status !== "active") {
      throw new AppError(404, "Không tìm thấy nhân viên");
    }
    return employee;
  },
};
