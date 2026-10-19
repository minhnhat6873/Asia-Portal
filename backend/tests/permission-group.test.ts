import type { Request, Response } from "express";
import { permissionGroupService } from "../src/services/admin/permission-group.service";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { createPermissionGroupSchema, updatePermissionGroupSchema } from "../src/validates/admin/permission-group.validate";
import { PERMISSION_GROUP_COLORS, PERMISSION_GROUP_ICONS } from "../src/interfaces/permission-group.interface";
import { requireAdminRole } from "../src/middlewares/auth.middleware";

const id = "507f1f77bcf86cd799439012";
const stored = { _id: id, name: "Nhân sự", description: "Nhóm nhân sự", actions: ["employees:view"], status: "active", color: "purple", icon: "briefcase" };
afterEach(() => jest.restoreAllMocks());

describe("permission group appearance", () => {
  it.each(PERMISSION_GROUP_COLORS)("accepts supported color %s", (color) => {
    const result = createPermissionGroupSchema.validate({ name: "HR", actions: ["employees:view"], color, icon: "users" });
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({ color, icon: "users" });
  });
  it.each(PERMISSION_GROUP_ICONS)("accepts supported icon %s", (icon) => {
    expect(updatePermissionGroupSchema.validate({ icon }).error).toBeUndefined();
  });
  it.each([{ color: "#fff" }, { icon: "<script>" }, { color: "" }, { icon: null }])("rejects unsupported appearance %j", (fields) => {
    expect(createPermissionGroupSchema.validate({ name: "HR", actions: ["employees:view"], ...fields }).error).toBeDefined();
    expect(updatePermissionGroupSchema.validate(fields).error).toBeDefined();
  });
  it("defaults new groups but does not reset appearance on status-only patches", () => {
    expect(createPermissionGroupSchema.validate({ name: "HR", actions: ["employees:view"] }).value).toMatchObject({ color: "emerald", icon: "shield" });
    expect(updatePermissionGroupSchema.validate({ status: "inactive" }).value).toEqual({ status: "inactive" });
  });
  it("returns fallbacks for existing records without appearance fields", async () => {
    jest.spyOn(permissionGroupRepository, "findAll").mockResolvedValue([{ ...stored, color: undefined, icon: undefined }] as never);
    expect(await permissionGroupService.getGroups()).toEqual([expect.objectContaining({ id, color: "emerald", icon: "shield" })]);
  });
  it("persists and returns appearance on create", async () => {
    jest.spyOn(permissionGroupRepository, "findByName").mockResolvedValue(null);
    const create = jest.spyOn(permissionGroupRepository, "create").mockResolvedValue({ toObject: () => stored } as never);
    expect(await permissionGroupService.createGroup({ name: stored.name, actions: ["employees:view"], color: "purple", icon: "briefcase" })).toMatchObject({ color: "purple", icon: "briefcase" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ color: "purple", icon: "briefcase" }));
  });
  it("allows updating appearance while preserving existing actions and status", async () => {
    const update = jest.spyOn(permissionGroupRepository, "updateById").mockResolvedValue({ ...stored, color: "blue", icon: "user" } as never);
    const result = await permissionGroupService.updateGroup(id, { color: "blue", icon: "user" });
    expect(update).toHaveBeenCalledWith(id, { color: "blue", icon: "user", actions: undefined });
    expect(result).toMatchObject({ color: "blue", icon: "user", status: "active", actions: ["employees:view"] });
  });
});

describe("permission group deletion", () => {
  beforeEach(() => {
    jest.spyOn(permissionGroupRepository, "deleteById").mockResolvedValue(stored as never);
    jest.spyOn(adminAccountRepository, "removePermissionGroup").mockResolvedValue({ modifiedCount: 2 } as never);
  });
  it("rejects invalid IDs before making database changes", async () => {
    await expect(permissionGroupService.deleteGroup("invalid")).rejects.toMatchObject({ statusCode: 400 });
    expect(permissionGroupRepository.deleteById).not.toHaveBeenCalled();
    expect(adminAccountRepository.removePermissionGroup).not.toHaveBeenCalled();
  });
  it.each(["active", "inactive"])("deletes a %s group and removes assignments without deleting accounts", async (status) => {
    jest.mocked(permissionGroupRepository.deleteById).mockResolvedValue({ ...stored, status } as never);
    const deleteAccount = jest.spyOn(adminAccountRepository, "deleteById");
    expect(await permissionGroupService.deleteGroup(id)).toMatchObject({ id, name: stored.name });
    expect(adminAccountRepository.removePermissionGroup).toHaveBeenCalledWith(id);
    expect(deleteAccount).not.toHaveBeenCalled();
  });
  it("returns 404 for a missing group and cleans any stale assignments", async () => {
    jest.mocked(permissionGroupRepository.deleteById).mockResolvedValue(null);
    await expect(permissionGroupService.deleteGroup(id)).rejects.toMatchObject({ statusCode: 404 });
    expect(adminAccountRepository.removePermissionGroup).toHaveBeenCalledWith(id);
  });
  it("does not report success on a failed database delete or remove assignments", async () => {
    jest.mocked(permissionGroupRepository.deleteById).mockRejectedValue(new Error("database unavailable"));
    await expect(permissionGroupService.deleteGroup(id)).rejects.toThrow("database unavailable");
    expect(adminAccountRepository.removePermissionGroup).not.toHaveBeenCalled();
  });
  it("propagates failed assignment cleanup instead of reporting success", async () => {
    jest.mocked(adminAccountRepository.removePermissionGroup).mockRejectedValue(new Error("cleanup failed"));
    await expect(permissionGroupService.deleteGroup(id)).rejects.toThrow("cleanup failed");
  });
  it("does not allow a manager to manage groups", () => {
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const next = jest.fn();
    requireAdminRole("admin")({ admin: { role: "manager" } } as Request, response as unknown as Response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
