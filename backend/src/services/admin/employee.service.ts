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

function ensureCeoDepartment(rank: Employee["rank"], department: string): void {
  if (rank === "CEO" && department !== "BOD") {
    throw new AppError(400, "Chỉ phòng BOD được chọn cấp bậc CEO");
  }
}

export const adminEmployeeService = {
  async importEmployees(rows: (CreateEmployeeInput & { importRow: number })[], createdBy: NonNullable<Employee["createdBy"]>) {
    const ceos = rows.filter((row) => row.rank === "CEO");
    if (ceos.length > 1) throw new AppError(409, "File chỉ được có một CEO.");
    try {
      await adminEmployeeRepository.ensureImportIndexes();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(409, "Dữ liệu hiện có bị trùng mã, email hoặc số điện thoại; cần xử lý dữ liệu trùng trước khi nhập. Không có nhân viên nào được nhập.");
      throw error;
    }
    const session = await mongoose.startSession();
    try {
      let inserted: Awaited<ReturnType<typeof adminEmployeeRepository.insertImportedEmployees>> = [];
      await session.withTransaction(async () => {
        const conflicts = await adminEmployeeRepository.findImportConflicts(rows.map((row) => row.employeeCode), rows.map((row) => row.email), rows.map((row) => row.phone), session);
        const errors: string[] = [];
        for (const row of rows) {
          const conflict = conflicts.find((item) => item.employeeCode === row.employeeCode || item.email === row.email || item.phone === row.phone);
          if (conflict) {
            const fields = [conflict.employeeCode === row.employeeCode && "mã nhân viên", conflict.email === row.email && "email", conflict.phone === row.phone && "số điện thoại"].filter(Boolean).join(", ");
            errors.push(`Dòng ${row.importRow}: ${fields} đã tồn tại${conflict.isDeleted ? " trong thùng rác" : ""}.`);
          }
        }
        if (ceos.length && await adminEmployeeRepository.findActiveCeoForImport(session)) errors.push(`Dòng ${ceos[0].importRow}: công ty đã có CEO.`);
        if (errors.length) throw new AppError(409, errors.slice(0, 30).join("\n"));
        inserted = await adminEmployeeRepository.insertImportedEmployees(rows.map(({ importRow: _importRow, ...row }) => ({ ...row, createdBy })), session);
      });
      return inserted;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(409, "Mã nhân viên, email hoặc số điện thoại vừa bị trùng. Không có nhân viên nào được nhập; vui lòng kiểm tra lại.");
      if ((error as { code?: number }).code === 20 || (error as Error).message?.includes("Transaction numbers are only allowed")) throw new AppError(503, "Cơ sở dữ liệu chưa hỗ trợ giao dịch an toàn; chưa nhập dữ liệu. Vui lòng cấu hình MongoDB replica set.");
      throw error;
    } finally { await session.endSession(); }
  },
  async getEmployees(query: EmployeeListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Employee> = { isDeleted: { $ne: true } };

    if (query.department) filter.department = query.department;
    if (query.position) filter.position = query.position;
    if (query.rank) filter.rank = query.rank;
    if (query.status) filter.status = query.status;

    const direction = query.sort === "oldest" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { createdAt: direction, _id: direction };
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
    ensureCeoDepartment(data.rank, data.department);
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

    if (data.rank !== undefined || data.department !== undefined) {
      const current = await adminEmployeeRepository.findById(id);
      if (!current) throw new AppError(404, "Không tìm thấy nhân viên");
      ensureCeoDepartment(data.rank ?? current.rank, data.department ?? current.department);
    }

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
