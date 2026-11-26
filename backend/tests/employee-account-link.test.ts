jest.mock("../src/services/vehicle/vehicle-account-closed", () => ({ vehicleAccountClosedService: { cancelOpenTrips: jest.fn().mockResolvedValue(0) } }));
import type { Request, Response } from "express";

jest.mock("../src/services/admin/employee.service", () => ({ adminEmployeeService: {
  getEmployeeById: jest.fn(), updateEmployee: jest.fn(), softDeleteEmployee: jest.fn(), permanentlyDeleteEmployee: jest.fn(), restoreEmployee: jest.fn(),
} }));
jest.mock("../src/services/admin/audit-log.service", () => ({ auditLogService: { record: jest.fn() } }));
jest.mock("../src/helpers/multerCloudinary.helper", () => ({
  deleteCloudinaryAsset: jest.fn(), getCloudinaryPublicIdFromUrl: jest.fn(() => ""),
}));

import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { employeeAccountLinkService } from "../src/services/admin/employee-account-link.service";
import { adminEmployeeService } from "../src/services/admin/employee.service";
import { auditLogService } from "../src/services/admin/audit-log.service";
import { permanentlyDeleteEmployee, restoreEmployee, softDeleteEmployee, updateEmployee } from "../src/controllers/admin/employee.controller";

// Employee records and login accounts are matched by email. Leaving or removal locks the
// login; permanent deletion deletes it; Admin gốc accounts are never changed automatically.
const employee = { _id: "507f1f77bcf86cd799439031", employeeCode: "AC-00035", name: "Phan Thị Bảo Trung", email: "trung.pt@asiafnb.com", status: "active" };
const account = (role: string, status = "active") => ({ _id: "507f1f77bcf86cd799439032", name: employee.name, email: employee.email, role, status });

describe("employee account link service", () => {
  afterEach(() => jest.restoreAllMocks());

  it("does nothing when the employee has no account", async () => {
    jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(null);
    const lock = jest.spyOn(adminAccountRepository, "lockLinked");
    expect(await employeeAccountLinkService.lockForEmployee(employee.email, "employee-left")).toEqual({ action: "none" });
    expect(lock).not.toHaveBeenCalled();
  });

  it.each(["user", "manager"])("locks with the reason and moves a %s account to the trash", async (role) => {
    jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(account(role) as never);
    const lock = jest.spyOn(adminAccountRepository, "lockLinked").mockResolvedValue(account(role, "inactive") as never);
    const trash = jest.spyOn(adminAccountRepository, "trashLinked").mockResolvedValue(account(role) as never);
    expect(await employeeAccountLinkService.lockForEmployee(employee.email, "employee-left")).toMatchObject({ action: "locked", email: employee.email });
    expect(lock).toHaveBeenCalledWith("507f1f77bcf86cd799439032", "employee-left");
    const by = { accountId: "a9", name: "HR", email: "hr@asiafnb.com" };
    expect(await employeeAccountLinkService.trashForEmployee(employee.email, by)).toMatchObject({ action: "trashed" });
    expect(trash).toHaveBeenCalledWith("507f1f77bcf86cd799439032", by);
  });

  it("never locks or trashes an Admin gốc account", async () => {
    jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(account("admin") as never);
    const lock = jest.spyOn(adminAccountRepository, "lockLinked"), trash = jest.spyOn(adminAccountRepository, "trashLinked");
    expect(await employeeAccountLinkService.lockForEmployee(employee.email, "employee-deleted")).toMatchObject({ action: "admin-skipped" });
    expect(await employeeAccountLinkService.trashForEmployee(employee.email)).toMatchObject({ action: "admin-skipped" });
    expect(lock).not.toHaveBeenCalled(); expect(trash).not.toHaveBeenCalled();
  });

  it("reports nothing when the account was already locked", async () => {
    jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(account("user", "inactive") as never);
    jest.spyOn(adminAccountRepository, "lockLinked").mockResolvedValue(null);
    expect(await employeeAccountLinkService.lockForEmployee(employee.email, "employee-left")).toEqual({ action: "none" });
  });
});

describe("employee actions update the linked account", () => {
  const admin = { id: "507f1f77bcf86cd799439033", name: "HR", email: "hr@asiafnb.com", permissions: [] };
  const request = (body: object = {}) => ({ body, params: { id: employee._id }, admin }) as unknown as Request;
  const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res as unknown as Response & { json: jest.Mock }; };
  let lock: jest.SpyInstance, remove: jest.SpyInstance;
  beforeEach(() => {
    jest.mocked(auditLogService.record).mockResolvedValue(undefined as never);
    jest.mocked(adminEmployeeService.getEmployeeById).mockResolvedValue({ ...employee } as never);
    jest.mocked(adminEmployeeService.updateEmployee).mockImplementation(async (_id, data) => ({ ...employee, ...data }) as never);
    jest.mocked(adminEmployeeService.softDeleteEmployee).mockResolvedValue({ ...employee } as never);
    jest.mocked(adminEmployeeService.restoreEmployee).mockResolvedValue({ ...employee } as never);
    jest.mocked(adminEmployeeService.permanentlyDeleteEmployee).mockResolvedValue({ ...employee } as never);
    lock = jest.spyOn(employeeAccountLinkService, "lockForEmployee").mockResolvedValue({ action: "locked", accountId: "a1", name: employee.name, email: employee.email });
    remove = jest.spyOn(employeeAccountLinkService, "trashForEmployee").mockResolvedValue({ action: "trashed", accountId: "a1", name: employee.name, email: employee.email });
  });
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

  it("locks the account when the employee is moved to the trash, and audits it", async () => {
    const res = response(), next = jest.fn();
    await softDeleteEmployee(request() as never, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith(employee.email, "employee-deleted");
    expect(res.json.mock.calls[0][0]).toMatchObject({ message: "Đã chuyển nhân viên vào thùng rác", data: { linkedAccount: "locked" } });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "account.auto_locked", entityId: "a1" }));
  });

  it("locks the account when the employee newly leaves, including a changed email", async () => {
    const next = jest.fn();
    await updateEmployee(request({ status: "inactive", email: "moi@asiafnb.com" }) as never, response(), next);
    expect(next).not.toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith(employee.email, "employee-left");
    expect(lock).toHaveBeenCalledWith("moi@asiafnb.com", "employee-left");
  });

  it("does not re-lock when an already inactive employee is saved again, or for other edits", async () => {
    jest.mocked(adminEmployeeService.getEmployeeById).mockResolvedValue({ ...employee, status: "inactive" } as never);
    await updateEmployee(request({ status: "inactive", name: "Tên Mới" }) as never, response(), jest.fn());
    await updateEmployee(request({ status: "probation" }) as never, response(), jest.fn());
    expect(lock).not.toHaveBeenCalled();
  });

  it("leaves the account locked when the employee is restored", async () => {
    await restoreEmployee(request() as never, response(), jest.fn());
    expect(lock).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });

  it("moves the account to the account trash when the employee is permanently deleted", async () => {
    const res = response();
    await permanentlyDeleteEmployee(request() as never, res, jest.fn());
    expect(remove).toHaveBeenCalledWith(employee.email, { accountId: admin.id, name: admin.name, email: admin.email });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "account.auto_trashed", entityId: "a1" }));
    expect(res.json.mock.calls[0][0].data.linkedAccount).toBe("trashed");
  });

  it("reports clearly when the account could not be locked", async () => {
    lock.mockRejectedValue(new Error("database down"));
    const next = jest.fn();
    await softDeleteEmployee(request() as never, response(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500, message: expect.stringContaining("chưa khóa được tài khoản") }));
  });

  it("tells the admin when an Admin gốc account was left unchanged", async () => {
    lock.mockResolvedValue({ action: "admin-skipped", accountId: "a1", name: employee.name, email: employee.email });
    const res = response();
    await softDeleteEmployee(request() as never, res, jest.fn());
    expect(res.json.mock.calls[0][0].data.linkedAccount).toBe("admin-skipped");
    expect(auditLogService.record).not.toHaveBeenCalledWith(expect.objectContaining({ action: "account.auto_locked" }));
  });
});

describe("linked account outcome in employee responses", () => {
  const admin = { id: "507f1f77bcf86cd799439033", name: "HR", email: "hr@asiafnb.com", permissions: [] };
  const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res as unknown as Response & { json: jest.Mock }; };
  beforeEach(() => {
    jest.mocked(auditLogService.record).mockResolvedValue(undefined as never);
    jest.mocked(adminEmployeeService.getEmployeeById).mockResolvedValue({ ...employee } as never);
    jest.mocked(adminEmployeeService.updateEmployee).mockImplementation(async (_id, data) => ({ ...employee, ...data }) as never);
  });
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

  it("reports none for ordinary edits and when the employee has no account", async () => {
    const lock = jest.spyOn(employeeAccountLinkService, "lockForEmployee").mockResolvedValue({ action: "none" });
    const edit = response(), leave = response();
    await updateEmployee({ body: { name: "Tên Mới" }, params: { id: employee._id }, admin } as never, edit, jest.fn());
    await updateEmployee({ body: { status: "inactive" }, params: { id: employee._id }, admin } as never, leave, jest.fn());
    expect(edit.json.mock.calls[0][0].data.linkedAccount).toBe("none");
    expect(leave.json.mock.calls[0][0].data.linkedAccount).toBe("none");
    expect(lock).toHaveBeenCalledTimes(1);
  });

  it("reports admin-skipped over locked when both emails matched", async () => {
    jest.spyOn(employeeAccountLinkService, "lockForEmployee").mockImplementation(async (email) => email === employee.email
      ? { action: "admin-skipped", accountId: "a1", name: "A", email }
      : { action: "locked", accountId: "a2", name: "B", email });
    const res = response();
    await updateEmployee({ body: { status: "inactive", email: "moi@asiafnb.com" }, params: { id: employee._id }, admin } as never, res, jest.fn());
    expect(res.json.mock.calls[0][0].data.linkedAccount).toBe("admin-skipped");
  });
});
