import mongoose, { type QueryFilter } from "mongoose";

import type {
  CreateEmployeeInput,
  Employee,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "../../interfaces/employee.interface";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { AppError } from "../../utils/errors/AppError";
import { escapeRegex } from "../../utils/regex/escapeRegex";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã nhân viên không hợp lệ");
  }
}

export const adminEmployeeService = {
  async getEmployees(query: EmployeeListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Employee> = {};

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
    if (query.status) filter.status = query.status;

    const sortDirection = query.sort === "oldest" ? 1 : -1;
    const [items, total] = await Promise.all([
      adminEmployeeRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit,
        sort: { joinDate: sortDirection },
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
    const [emailExists, codeExists] = await Promise.all([
      adminEmployeeRepository.findByEmail(data.email),
      adminEmployeeRepository.findByEmployeeCode(data.employeeCode),
    ]);

    if (emailExists) throw new AppError(409, "Email nhân viên đã tồn tại");
    if (codeExists) throw new AppError(409, "Mã nhân viên đã tồn tại");

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

    const updatedEmployee = await adminEmployeeRepository.updateById(id, data);
    if (!updatedEmployee) throw new AppError(404, "Không tìm thấy nhân viên");
    return updatedEmployee;
  },
};
