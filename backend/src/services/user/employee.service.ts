import mongoose, { type QueryFilter } from "mongoose";

import type {
  Employee,
  EmployeeListQuery,
} from "../../interfaces/employee.interface";
import { userEmployeeRepository } from "../../repositories/user/employee.repository";
import { AppError } from "../../utils/errors/AppError";
import { normalizeSearchText } from "../../utils/text/normalizeSearchText";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã nhân viên không hợp lệ");
  }
}

export const userEmployeeService = {
  async getEmployees(query: EmployeeListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Employee> = { status: "active", isDeleted: { $ne: true } };

    if (query.department) filter.department = query.department;
    if (query.position) filter.position = query.position;
    if (query.rank) filter.rank = query.rank;

    const sortDirection = query.sort === "oldest" ? 1 : -1;
    const sort = { joinDate: sortDirection as 1 | -1 };
    const normalizedSearch = normalizeSearchText(query.search);
    if (normalizedSearch) {
      const matchingItems = (await userEmployeeRepository.findAllForSearch(filter, sort)).filter((employee) =>
        normalizeSearchText(`${employee.employeeCode} ${employee.name}`).includes(normalizedSearch),
      );
      const total = matchingItems.length;
      const items = matchingItems.slice((page - 1) * limit, page * limit);
      return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const [items, total] = await Promise.all([
      userEmployeeRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit,
        sort,
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
