import mongoose from "mongoose";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminEmployeeService } from "../src/services/admin/employee.service";
import type { CreateEmployeeInput } from "../src/interfaces/employee.interface";

const actor = { accountId: "admin-id", name: "Admin", email: "admin@example.com" };
const row = { employeeCode: "000123", email: "an@asiafnb.com", phone: "0901234567", rank: "Staff", importRow: 2 } as CreateEmployeeInput & { importRow: number };

describe("employee import transaction", () => {
  const session = { withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()), endSession: jest.fn() };
  beforeEach(() => {
    jest.restoreAllMocks();
    session.withTransaction.mockClear(); session.endSession.mockClear();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(session as never);
    jest.spyOn(adminEmployeeRepository, "ensureImportIndexes").mockResolvedValue([] as never);
    jest.spyOn(adminEmployeeRepository, "findImportConflicts").mockResolvedValue([] as never);
    jest.spyOn(adminEmployeeRepository, "insertImportedEmployees").mockResolvedValue([{ employeeCode: row.employeeCode }] as never);
  });

  it("records the authenticated administrator on every inserted employee", async () => {
    await adminEmployeeService.importEmployees([row], actor);
    expect(adminEmployeeRepository.insertImportedEmployees).toHaveBeenCalledWith([expect.objectContaining({ createdBy: actor, employeeCode: "000123" })], session);
    expect(session.endSession).toHaveBeenCalled();
  });

  it("rejects conflicts in the trash before inserting anything", async () => {
    jest.mocked(adminEmployeeRepository.findImportConflicts).mockResolvedValue([{ employeeCode: row.employeeCode, isDeleted: true }] as never);
    await expect(adminEmployeeService.importEmployees([row], actor)).rejects.toThrow("trong thùng rác");
    expect(adminEmployeeRepository.insertImportedEmployees).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it("refuses to import when transactions are unavailable", async () => {
    session.withTransaction.mockRejectedValueOnce(Object.assign(new Error("Transaction numbers are only allowed on a replica set member"), { code: 20 }));
    await expect(adminEmployeeService.importEmployees([row], actor)).rejects.toMatchObject({ statusCode: 503 });
    expect(adminEmployeeRepository.insertImportedEmployees).not.toHaveBeenCalled();
  });
});
