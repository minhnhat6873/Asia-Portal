jest.mock("../src/services/vehicle/vehicle-account-closed", () => ({ vehicleAccountClosedService: { cancelOpenTrips: jest.fn().mockResolvedValue(0) } }));
import type { ClientSession } from "mongoose";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { accountAdministrationRepository } from "../src/repositories/admin/account-administration.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { accountContactService } from "../src/services/account-contact.service";
import { adminAccountService } from "../src/services/admin/account.service";

// A manager granted "accounts:manage-users" may manage user accounts only.
const managerId = "507f1f77bcf86cd799439021", userId = "507f1f77bcf86cd799439022", otherManagerId = "507f1f77bcf86cd799439023", adminId = "507f1f77bcf86cd799439024";
const session = {} as ClientSession;
const stored: Record<string, { _id: string; name: string; email: string; role: string; status: string; permissionGroupIds: string[] }> = {
  [managerId]: { _id: managerId, name: "HR", email: "hr@asiafnb.com", role: "manager", status: "active", permissionGroupIds: ["507f1f77bcf86cd7994390aa"] },
  [userId]: { _id: userId, name: "Nhân viên", email: "nv@asiafnb.com", role: "user", status: "active", permissionGroupIds: [] },
  [otherManagerId]: { _id: otherManagerId, name: "Quản lý", email: "ql@asiafnb.com", role: "manager", status: "active", permissionGroupIds: [] },
  [adminId]: { _id: adminId, name: "Admin", email: "admin@asiafnb.com", role: "admin", status: "active", permissionGroupIds: [] },
};
let groupActions: string[];
const newAccount = { name: "Người Mới", email: "moi@asiafnb.com", phone: "0901234567", password: "Password123!" };

beforeEach(() => {
  groupActions = ["accounts:manage-users"];
  jest.spyOn(accountAdministrationRepository, "runExclusive").mockImplementation((work) => work(session));
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation((id) => Promise.resolve(stored[String(id)] ?? null) as never);
  jest.spyOn(adminAccountRepository, "findById").mockImplementation((id) => Promise.resolve(stored[String(id)] ?? null) as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockImplementation((ids) => Promise.resolve(ids.map(() => ({ actions: groupActions }))) as never);
  jest.spyOn(adminAccountRepository, "updateById").mockImplementation((id, data) => Promise.resolve({ ...stored[String(id)], ...data }) as never);
  jest.spyOn(adminAccountRepository, "resetManagedPassword").mockImplementation((id) => Promise.resolve(stored[String(id)]) as never);
  jest.spyOn(adminAccountRepository, "softDelete").mockImplementation((id) => Promise.resolve(stored[String(id)]) as never);
  jest.spyOn(adminAccountRepository, "countActiveAdmins").mockResolvedValue(2);
  jest.spyOn(adminAccountRepository, "create").mockImplementation((data) => Promise.resolve({ toObject: () => ({ _id: "507f1f77bcf86cd799439099", ...data }) }) as never);
  jest.spyOn(accountContactService, "ensureAvailable").mockResolvedValue(undefined as never);
});
afterEach(() => jest.restoreAllMocks());

describe("manager with the user-account permission", () => {
  it("lists only user accounts, while Admin gốc lists everything", async () => {
    const findAll = jest.spyOn(adminAccountRepository, "findAll").mockResolvedValue([]);
    await adminAccountService.getAccounts({ role: "manager" });
    expect(findAll).toHaveBeenLastCalledWith(["user"]);
    await adminAccountService.getAccounts({ role: "admin" });
    expect(findAll).toHaveBeenLastCalledWith(undefined);
  });

  it("creates user accounts without permission groups", async () => {
    await expect(adminAccountService.createAccount({ ...newAccount, role: "user" }, managerId)).resolves.toMatchObject({ role: "user", permissionGroupIds: [] });
  });

  it.each(["manager", "admin"] as const)("cannot create a %s account", async (role) => {
    await expect(adminAccountService.createAccount({ ...newAccount, role, permissionGroupIds: role === "manager" ? ["507f1f77bcf86cd7994390aa"] : [] }, managerId)).rejects.toMatchObject({ statusCode: 403 });
    expect(adminAccountRepository.create).not.toHaveBeenCalled();
  });

  it("edits, locks, resets and deletes user accounts", async () => {
    await expect(adminAccountService.updateAccount(userId, { name: "Tên Mới", status: "inactive" }, managerId)).resolves.toMatchObject({ status: "inactive" });
    await expect(adminAccountService.resetPassword(userId, { password: "Password123!", notifyUser: false }, managerId)).resolves.toEqual({ notificationSent: false });
    await expect(adminAccountService.deleteAccount(userId, managerId)).resolves.toMatchObject({ id: userId });
  });

  it("cannot promote a user or give them permission groups", async () => {
    for (const data of [{ role: "manager" as const }, { role: "admin" as const }, { permissionGroupIds: ["507f1f77bcf86cd7994390aa"] }]) {
      await expect(adminAccountService.updateAccount(userId, data, managerId)).rejects.toMatchObject({ statusCode: 403 });
    }
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
  });

  it.each([otherManagerId, adminId, managerId])("cannot touch a manager or Admin gốc account (%s)", async (target) => {
    await expect(adminAccountService.updateAccount(target, { name: "Đổi Tên" }, managerId)).rejects.toMatchObject({ statusCode: 403 });
    if (target !== managerId) {
      await expect(adminAccountService.resetPassword(target, { password: "Password123!", notifyUser: false }, managerId)).rejects.toMatchObject({ statusCode: 403 });
      await expect(adminAccountService.deleteAccount(target, managerId)).rejects.toMatchObject({ statusCode: 403 });
    }
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
    expect(adminAccountRepository.resetManagedPassword).not.toHaveBeenCalled();
    expect(adminAccountRepository.softDelete).not.toHaveBeenCalled();
  });

  it("loses access as soon as the permission is removed from their groups", async () => {
    groupActions = ["employees:view"];
    await expect(adminAccountService.updateAccount(userId, { name: "Tên Mới" }, managerId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(adminAccountService.createAccount({ ...newAccount, role: "user" }, managerId)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("Admin gốc", () => {
  it("can still promote a user to manager and assign groups", async () => {
    await adminAccountService.updateAccount(userId, { role: "manager", permissionGroupIds: ["507f1f77bcf86cd7994390aa"] }, adminId);
    expect(adminAccountRepository.updateById).toHaveBeenCalledWith(userId, expect.objectContaining({ role: "manager" }), "user", session);
  });
  it("refuses to make a manager without any permission group", async () => {
    for (const data of [{ role: "manager" as const }, { role: "manager" as const, permissionGroupIds: [] }]) {
      await expect(adminAccountService.updateAccount(userId, data, adminId)).rejects.toMatchObject({ statusCode: 400, message: "Vui lòng chọn ít nhất một nhóm quyền cho tài khoản Quản lý." });
    }
    await expect(adminAccountService.updateAccount(otherManagerId, { permissionGroupIds: [] }, adminId)).rejects.toMatchObject({ statusCode: 400 });
    // A manager created before this rule can still be renamed.
    await expect(adminAccountService.updateAccount(otherManagerId, { name: "Tên Mới" }, adminId)).resolves.toMatchObject({ name: "Tên Mới" });
  });
  it("clears permission groups when demoting a manager to user", async () => {
    await adminAccountService.updateAccount(otherManagerId, { role: "user", permissionGroupIds: ["507f1f77bcf86cd7994390aa"] }, adminId);
    expect(adminAccountRepository.updateById).toHaveBeenCalledWith(otherManagerId, expect.objectContaining({ role: "user", permissionGroupIds: [] }), "manager", session);
  });
});

describe("employee lookup for linking a new account", () => {
  const employees = [
    { _id: "e1", employeeCode: "AC-00035", name: "Phan Thị Bảo Trung", email: "trung.pt@asiafnb.com", phone: "0901111111", department: "R&D", position: "R&D Staff", status: "active" },
    { _id: "e2", employeeCode: "AC-00034", name: "Nguyễn Thị Hồng Vân", email: "van.nth@asiafnb.com", phone: "0902222222", department: "R&D", position: "R&D Executive", status: "probation" },
  ];
  beforeEach(() => {
    jest.spyOn(adminEmployeeRepository, "findAllForSearch").mockResolvedValue(employees as never);
    jest.spyOn(adminAccountRepository, "findByEmails").mockResolvedValue([{ _id: "a1", email: "van.nth@asiafnb.com", role: "user", status: "active" }] as never);
  });

  it("matches name without accents, code or email, and reports existing accounts", async () => {
    expect((await adminAccountService.lookupEmployees("trung")).map((item) => item.employeeCode)).toEqual(["AC-00035"]);
    expect((await adminAccountService.lookupEmployees("AC-00034"))[0]).toMatchObject({ name: "Nguyễn Thị Hồng Vân", account: { id: "a1", status: "active" } });
    expect((await adminAccountService.lookupEmployees("trung.pt@asiafnb.com"))[0]).toMatchObject({ email: "trung.pt@asiafnb.com", account: null });
  });
  it("skips deleted and departed employees and ignores empty queries", async () => {
    await adminAccountService.lookupEmployees("trung");
    expect(adminEmployeeRepository.findAllForSearch).toHaveBeenCalledWith({ isDeleted: { $ne: true }, status: { $ne: "inactive" } }, { name: 1 });
    expect(await adminAccountService.lookupEmployees("   ")).toEqual([]);
  });
});

describe("employee lookup marks accounts in the trash", () => {
  it("returns inTrash so the picker can label them", async () => {
    jest.spyOn(adminEmployeeRepository, "findAllForSearch").mockResolvedValue([
      { _id: "e1", employeeCode: "AC-00001", name: "Người Đang Dùng", email: "a@asiafnb.com", phone: "", department: "", position: "", status: "active" },
      { _id: "e2", employeeCode: "AC-00002", name: "Người Bị Xóa", email: "b@asiafnb.com", phone: "", department: "", position: "", status: "active" },
    ] as never);
    jest.spyOn(adminAccountRepository, "findByEmails").mockResolvedValue([
      { _id: "a1", email: "a@asiafnb.com", role: "user", status: "active" },
      { _id: "a2", email: "b@asiafnb.com", role: "user", status: "inactive", isDeleted: true },
    ] as never);
    const [active, trashed] = await adminAccountService.lookupEmployees("asiafnb");
    expect(active!.account).toMatchObject({ id: "a1", inTrash: false });
    expect(trashed!.account).toMatchObject({ id: "a2", inTrash: true });
  });
});
