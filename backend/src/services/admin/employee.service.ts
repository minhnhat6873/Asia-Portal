import mongoose, { type QueryFilter } from "mongoose";

import type {
  CreateEmployeeInput,
  Employee,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "../../interfaces/employee.interface";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { AppError } from "../../utils/errors/AppError";
import { normalizeSearchText } from "../../utils/text/normalizeSearchText";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã nhân viên không hợp lệ");
  }
}

export const adminEmployeeService = {
  async getEmployees(query: EmployeeListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Employee> = { isDeleted: { $ne: true } };

    if (query.department) filter.department = query.department;
    if (query.position) filter.position = query.position;
    if (query.rank) filter.rank = query.rank;
    if (query.status) filter.status = query.status;

    const sort: Record<string, 1 | -1> = query.sort
      ? { joinDate: query.sort === "oldest" ? 1 : -1 }
      : { employeeCode: 1 };
    const normalizedSearch = normalizeSearchText(query.search);
    if (normalizedSearch) {
      const matchingItems = (await adminEmployeeRepository.findAllForSearch(filter, sort)).filter((employee) =>
        normalizeSearchText(`${employee.employeeCode} ${employee.name}`).includes(normalizedSearch),
      );
      const total = matchingItems.length;
      const items = matchingItems.slice((page - 1) * limit, page * limit);
      return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const [items, total] = await Promise.all([
      adminEmployeeRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit,
        sort,
      }),
      adminEmployeeRepository.count(filter),
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
    const employee = await adminEmployeeRepository.findById(id);
    if (!employee) throw new AppError(404, "Không tìm thấy nhân viên");
    return employee;
  },

  async createEmployee(data: CreateEmployeeInput) {
    const [emailExists, codeExists, ceoExists] = await Promise.all([
      adminEmployeeRepository.findByEmail(data.email),
      adminEmployeeRepository.findByEmployeeCode(data.employeeCode),
      data.rank === "CEO" ? adminEmployeeRepository.findActiveByRank("CEO") : null,
    ]);

    if (emailExists) throw new AppError(409, "Email nhân viên đã tồn tại");
    if (codeExists) throw new AppError(409, "Mã nhân viên đã tồn tại");

    if (ceoExists) throw new AppError(409, "Công ty chỉ được có duy nhất một CEO");

    return adminEmployeeRepository.create(data);
  },

  async updateEmployee(id: string, data: UpdateEmployeeInput) {
    ensureValidId(id);

    if (data.email) {
      const employee = await adminEmployeeRepository.findByEmail(data.email);
      if (employee && employee._id.toString() !== id) {
        throw new AppError(409, "Email nhân viên đã tồn tại");
      }
    }

    if (data.employeeCode) {
      const employee = await adminEmployeeRepository.findByEmployeeCode(data.employeeCode);
      if (employee && employee._id.toString() !== id) {
        throw new AppError(409, "Mã nhân viên đã tồn tại");
      }
    }

    if (data.rank === "CEO") {
      const ceo = await adminEmployeeRepository.findActiveByRank("CEO");
      if (ceo && ceo._id.toString() !== id) {
        throw new AppError(409, "Công ty chỉ được có duy nhất một CEO");
      }
    }

    const updatedEmployee = await adminEmployeeRepository.updateById(id, data);
    if (!updatedEmployee) throw new AppError(404, "Không tìm thấy nhân viên");
    return updatedEmployee;
  },


  async softDeleteEmployee(id: string, deletedBy: Employee["deletedBy"]) {
    ensureValidId(id);
    const employee = await adminEmployeeRepository.softDeleteById(id, deletedBy);
    if (!employee) throw new AppError(404, "Không tìm thấy nhân viên");
    return employee;
  },

  async getDeletedEmployees(query: EmployeeListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const filter: QueryFilter<Employee> = { isDeleted: true };

    if (query.department) filter.department = query.department;
    if (query.rank) filter.rank = query.rank;
    if (query.status) filter.status = query.status;

    const sort = { deletedAt: -1 as const };
    const normalizedSearch = normalizeSearchText(query.search);
    if (normalizedSearch) {
      const matchingItems = (await adminEmployeeRepository.findAllForSearch(filter, sort)).filter((employee) =>
        normalizeSearchText(`${employee.employeeCode} ${employee.name}`).includes(normalizedSearch),
      );
      const total = matchingItems.length;
      const items = matchingItems.slice((page - 1) * limit, page * limit);
      return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const [items, total] = await Promise.all([
      adminEmployeeRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit,
        sort,
      }),
      adminEmployeeRepository.count(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
  async restoreEmployee(id: string) {
    ensureValidId(id);
    const deletedEmployee = await adminEmployeeRepository.findDeletedById(id);
    if (!deletedEmployee) throw new AppError(404, "Không tìm thấy nhân viên trong thùng rác");
    if (deletedEmployee.rank === "CEO") {
      const ceo = await adminEmployeeRepository.findActiveByRank("CEO");
      if (ceo) throw new AppError(409, "Không thể khôi phục vì công ty đã có CEO");
    }
    const employee = await adminEmployeeRepository.restoreById(id);
    if (!employee) throw new AppError(404, "Không tìm thấy nhân viên trong thùng rác");
    return employee;
  },

  async permanentlyDeleteEmployee(id: string) {
    ensureValidId(id);
    const employee = await adminEmployeeRepository.permanentlyDeleteById(id);
    if (!employee) throw new AppError(404, "Không tìm thấy nhân viên trong thùng rác");
    return employee;
  },
};
