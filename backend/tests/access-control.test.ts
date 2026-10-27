import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PERMISSION_ACTIONS, filterPermissionActions } from "../src/interfaces/permission-group.interface";
import { PERMISSION_CATALOG } from "../src/config/permission-catalog";
import { createPermissionGroupSchema } from "../src/validates/admin/permission-group.validate";
import { presentEmployee } from "../src/utils/employee/presentEmployee";
import { requirePermissions, requireAdminAuth } from "../src/middlewares/auth.middleware";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import * as controllers from "../src/controllers/admin/employee.controller";
import { adminEmployeeService } from "../src/services/admin/employee.service";
import { auditLogService } from "../src/services/admin/audit-log.service";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}
const employee = { _id: "507f1f77bcf86cd799439012", name: "Employee", employeeCode: "E01", birthDate: new Date("1995-03-15"), rank: "CEO", avatar: "" };
afterEach(() => jest.restoreAllMocks());

describe("permission catalog", () => {
  it("exposes the supported actions and rejects obsolete actions", () => {
    expect(PERMISSION_CATALOG).toHaveLength(17);
    expect(new Set(PERMISSION_CATALOG.map((p) => p.id))).toEqual(new Set(PERMISSION_ACTIONS));
    expect(filterPermissionActions(["employees:deactivate", "employees:view", "employees:view", "unknown"])).toEqual(["employees:view"]);
    expect(createPermissionGroupSchema.validate({ name: "HR", description: "Real description", actions: ["employees:view-birth-date", "employees:trash"] }).error).toBeUndefined();
    expect(createPermissionGroupSchema.validate({ name: "HR", actions: ["employees:deactivate"] }).error).toBeDefined();
  });
  it("does not grant trash access with the soft-delete permission", () => {
    const response = responseMock(), next = jest.fn();
    requirePermissions("employees:trash")({ admin: { permissions: ["employees:delete"] } } as Request, response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("birthday privacy", () => {
  it("redacts copies and Mongoose documents without mutating stored data", () => {
    expect(presentEmployee(employee, [])).not.toHaveProperty("birthDate");
    expect(presentEmployee({ toObject: () => ({ ...employee }) }, [])).not.toHaveProperty("birthDate");
    expect(employee.birthDate).toBeDefined();
    expect(presentEmployee(employee, ["employees:view-birth-date"])).toHaveProperty("birthDate");
  });
  it.each(["getEmployees", "getDeletedEmployees", "getEmployeeById", "createEmployee", "updateEmployee", "restoreEmployee", "softDeleteEmployee", "permanentlyDeleteEmployee", "updateEmployeeChartAvatar"] as const)("redacts birthday from %s responses", async (method) => {
    jest.spyOn(auditLogService, "record").mockResolvedValue(undefined as never);
    const list = { items: [employee], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
    jest.spyOn(adminEmployeeService, "getEmployees").mockResolvedValue(list as never);
    jest.spyOn(adminEmployeeService, "getDeletedEmployees").mockResolvedValue(list as never);
    for (const name of ["getEmployeeById", "createEmployee", "updateEmployee", "restoreEmployee", "softDeleteEmployee", "permanentlyDeleteEmployee"] as const) {
      jest.spyOn(adminEmployeeService, name).mockResolvedValue(employee as never);
    }
    const request = {
      body: { name: "Employee" }, query: {}, params: { id: employee._id },
      admin: { id: employee._id, name: "Manager", email: "manager@asiafnb.com", permissions: [] },
      ...(method === "updateEmployeeChartAvatar" ? { file: { path: "image-url", filename: "test-chart" } } : {}),
    } as unknown as Request;
    const response = responseMock(), next = jest.fn();
    await (controllers[method] as (req: Request, res: Response, next: () => void) => Promise<void>)(request, response, next);
    expect(next).not.toHaveBeenCalled();
    const payload = jest.mocked(response.json).mock.calls[0]![0] as { data: { items?: object[] } };
    for (const item of payload.data.items ?? [payload.data]) expect(item).not.toHaveProperty("birthDate");
  });
});

describe("live group resolution", () => {
  it("unions groups and revokes permissions with the same access token", async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-jwt-secret";
    try {
      jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({ _id: employee._id, name: "Manager", email: "manager@asiafnb.com", role: "manager", permissionGroupIds: [employee._id] } as never);
      const groups = jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([{ actions: ["employees:view", "employees:deactivate"] }, { actions: ["employees:view-birth-date", "employees:view"] }] as never);
      const token = jwt.sign({ tokenType: "access" }, process.env.JWT_SECRET, { subject: employee._id });
      const request = { cookies: { [AUTH_COOKIE_NAME]: token } } as unknown as Request;
      const next = jest.fn();
      await requireAdminAuth(request, responseMock(), next);
      expect(request.admin?.permissions).toEqual(["employees:view", "employees:view-birth-date"]);
      groups.mockResolvedValue([]);
      await requireAdminAuth(request, responseMock(), next);
      expect(request.admin?.permissions).toEqual([]);
      expect(next).toHaveBeenCalledTimes(2);
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
