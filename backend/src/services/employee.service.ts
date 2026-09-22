import mongoose, { type QueryFilter } from "mongoose";

import type {
  CreateEmployeeInput,
  Employee,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "../interfaces/employee.interface";
import { employeeRepository } from "../repositories/employee.repository";
import { AppError } from "../utils/errors/AppError";
import { escapeRegex } from "../utils/regex/escapeRegex";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã nhân viên không hợp lệ");
  }
}

export const employeeService = {
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
        { department: keyword },
        { position: keyword },
      ];
    }

    if (query.department) filter.department = query.department;
    if (query.position) filter.position = query.position;
    if (query.status) filter.status = query.status;

    const sortDirection = query.sort === "oldest" ? 1 : -1;
    const [items, total] = await Promise.all([
      employeeRepository.findAll({
        filter,
        skip: (page - 1) * limit,
        limit,
        sort: { createdAt: sortDirection },
      }),
      employeeRepository.count(filter),
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

  async getEmployeeById(id: string, activeOnly = false) {
    ensureValidId(id);
    const employee = await employeeRepository.findById(id);

    if (!employee || (activeOnly && employee.status !== "active")) {
      throw new AppError(404, "Không tìm thấy nhân viên");
    }

    return employee;
  },

  async createEmployee(data: CreateEmployeeInput) {
    const [emailExists, codeExists] = await Promise.all([
      employeeRepository.findByEmail(data.email),
      employeeRepository.findByEmployeeCode(data.employeeCode),
    ]);

    if (emailExists) throw new AppError(409, "Email nhân viên đã tồn tại");
    if (codeExists) throw new AppError(409, "Mã nhân viên đã tồn tại");

    return employeeRepository.create(data);
  },

  async updateEmployee(id: string, data: UpdateEmployeeInput) {
    ensureValidId(id);

    if (data.email) {
      const employee = await employeeRepository.findByEmail(data.email);
      if (employee && employee._id.toString() !== id) {
        throw new AppError(409, "Email nhân viên đã tồn tại");
      }
    }

    if (data.employeeCode) {
      const employee = await employeeRepository.findByEmployeeCode(data.employeeCode);
      if (employee && employee._id.toString() !== id) {
        throw new AppError(409, "Mã nhân viên đã tồn tại");
      }
    }

    const updatedEmployee = await employeeRepository.updateById(id, data);
    if (!updatedEmployee) throw new AppError(404, "Không tìm thấy nhân viên");
    return updatedEmployee;
  },
};