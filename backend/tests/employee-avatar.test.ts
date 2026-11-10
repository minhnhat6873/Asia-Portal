import type { NextFunction, Request, Response } from "express";

jest.mock("../src/services/admin/employee.service", () => ({ adminEmployeeService: {
  createEmployee: jest.fn(), updateEmployee: jest.fn(), getEmployeeById: jest.fn(), permanentlyDeleteEmployee: jest.fn(),
} }));
jest.mock("../src/services/admin/audit-log.service", () => ({ auditLogService: { record: jest.fn() } }));
jest.mock("../src/helpers/multerCloudinary.helper", () => ({
  ...jest.requireActual("../src/helpers/multerCloudinary.helper"), deleteCloudinaryAsset: jest.fn(),
}));

import { createEmployee, updateEmployee, permanentlyDeleteEmployee } from "../src/controllers/admin/employee.controller";
import { adminEmployeeService } from "../src/services/admin/employee.service";
import { auditLogService } from "../src/services/admin/audit-log.service";
import { deleteCloudinaryAsset } from "../src/helpers/multerCloudinary.helper";
import { validateEmployeeCreateUpload, validateEmployeeUpdateUpload } from "../src/middlewares/employee-upload.middleware";

const url = (id: string) => `https://res.cloudinary.com/demo/image/upload/v1/asia-portal/avatars/${id}.jpg`;
const base = { _id: "507f1f77bcf86cd799439011", employeeCode: "AC-00001", name: "Nhân viên mẫu", position: "Designer", department: "DESIGN", rank: "Staff", email: "test@asiafnb.com", phone: "0936123456", location: "Hồ Chí Minh", joinDate: "2024-01-01", gender: "female", avatar: url("old-crop"), avatarPublicId: "asia-portal/avatars/old-crop", avatarOriginal: url("source"), avatarOriginalPublicId: "asia-portal/avatars/source" };
const upload = (id: string) => ({ filename: `asia-portal/avatars/${id}`, path: url(id) }) as Express.Multer.File;
function request(body: object = {}, files: Record<string, Express.Multer.File[]> = {}) {
  return { body, files, params: { id: base._id }, admin: { id: "admin-test", name: "Admin", email: "admin@asiafnb.com", permissions: [] } } as unknown as Request;
}
function response() {
  const result = { status: jest.fn(), json: jest.fn() };
  result.status.mockReturnValue(result);
  return result as unknown as Response;
}

describe("employee original avatar persistence", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(deleteCloudinaryAsset).mockResolvedValue(undefined);
    jest.mocked(auditLogService.record).mockResolvedValue(undefined as never);
    jest.mocked(adminEmployeeService.getEmployeeById).mockResolvedValue({ ...base } as never);
    jest.mocked(adminEmployeeService.createEmployee).mockImplementation(async (data) => ({ ...data, _id: base._id }) as never);
    jest.mocked(adminEmployeeService.updateEmployee).mockImplementation(async (_id, data) => ({ ...base, ...data }) as never);
  });

  it("saves the original and crop separately on creation", async () => {
    const res = response();
    await createEmployee(request(base, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] }), res, jest.fn());
    expect(adminEmployeeService.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ avatar: url("new-crop"), avatarOriginal: url("new-source"), avatarOriginalPublicId: "asia-portal/avatars/new-source" }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled();
  });

  it("retains single-file uploads as their own source", async () => {
    await createEmployee(request(base, { avatar: [upload("new-crop")] }), response(), jest.fn());
    expect(adminEmployeeService.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ avatarOriginal: url("new-crop"), avatarOriginalPublicId: "asia-portal/avatars/new-crop" }));
  });

  it("retains the original when a saved employee is cropped again", async () => {
    const res = response();
    await updateEmployee(request({ name: base.name }, { avatar: [upload("new-crop")] }) as never, res, jest.fn());
    expect(jest.mocked(adminEmployeeService.updateEmployee).mock.calls[0][1]).not.toHaveProperty("avatarOriginal");
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(1);
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(base.avatarPublicId);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ avatarOriginal: base.avatarOriginal }) }));
  });

  it("preserves the available image for legacy records before replacing the crop", async () => {
    jest.mocked(adminEmployeeService.getEmployeeById).mockResolvedValue({ ...base, avatarOriginal: "", avatarOriginalPublicId: "" } as never);
    await updateEmployee(request({ name: base.name }, { avatar: [upload("new-crop")] }) as never, response(), jest.fn());
    expect(adminEmployeeService.updateEmployee).toHaveBeenCalledWith(base._id, expect.objectContaining({ avatarOriginal: base.avatar, avatarOriginalPublicId: base.avatarPublicId }));
    expect(deleteCloudinaryAsset).not.toHaveBeenCalledWith(base.avatarPublicId);
  });

  it("replaces both assets when a new original is uploaded", async () => {
    await updateEmployee(request({ name: base.name }, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] }) as never, response(), jest.fn());
    expect(adminEmployeeService.updateEmployee).toHaveBeenCalledWith(base._id, expect.objectContaining({ avatarOriginal: url("new-source") }));
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(base.avatarPublicId);
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(base.avatarOriginalPublicId);
    expect(deleteCloudinaryAsset).not.toHaveBeenCalledWith("asia-portal/avatars/new-source");
  });

  it("does not alter the source during an unrelated update", async () => {
    await updateEmployee(request({ name: "Tên mới" }) as never, response(), jest.fn());
    expect(adminEmployeeService.updateEmployee).toHaveBeenCalledWith(base._id, { name: "Tên mới" });
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled();
  });

  it("clears and deletes both assets when the avatar is removed", async () => {
    await updateEmployee(request({ avatar: "" }) as never, response(), jest.fn());
    expect(adminEmployeeService.updateEmployee).toHaveBeenCalledWith(base._id, { avatar: "", avatarPublicId: "", avatarOriginal: "", avatarOriginalPublicId: "" });
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(2);
  });

  it.each(["create", "update"])("cleans both new uploads after failed %s", async (kind) => {
    const failure = new Error("database failure");
    jest.mocked(adminEmployeeService.createEmployee).mockRejectedValue(failure);
    jest.mocked(adminEmployeeService.updateEmployee).mockRejectedValue(failure);
    const next = jest.fn() as NextFunction;
    const handler = kind === "create" ? createEmployee : updateEmployee;
    await handler(request(base, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] }) as never, response(), next);
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(2);
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith("asia-portal/avatars/new-source");
    expect(next).toHaveBeenCalledWith(failure);
  });

  it("does not delete persisted uploads after failed audit logging", async () => {
    jest.mocked(auditLogService.record).mockRejectedValue(new Error("audit failure"));
    await createEmployee(request(base, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] }), response(), jest.fn());
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled();
  });

  it("retains both newly saved assets if the update audit fails", async () => {
    jest.mocked(auditLogService.record).mockRejectedValue(new Error("audit failure"));
    await updateEmployee(request(base, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] }) as never, response(), jest.fn());
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(base.avatarPublicId);
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(base.avatarOriginalPublicId);
    expect(deleteCloudinaryAsset).not.toHaveBeenCalledWith("asia-portal/avatars/new-crop");
    expect(deleteCloudinaryAsset).not.toHaveBeenCalledWith("asia-portal/avatars/new-source");
  });

  it("accepts a valid upload pair but strips client-supplied source URLs and asset IDs", async () => {
    const req = request(base, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] });
    const next = jest.fn();
    await validateEmployeeCreateUpload(req, response(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).not.toHaveProperty("avatarOriginal");
    expect(req.body).not.toHaveProperty("avatarOriginalPublicId");
    expect(deleteCloudinaryAsset).not.toHaveBeenCalled();
  });

  it("deletes original, crop and chart assets once on permanent deletion", async () => {
    jest.mocked(adminEmployeeService.permanentlyDeleteEmployee).mockResolvedValue({ ...base, chartAvatar: base.avatar, chartAvatarPublicId: base.avatarPublicId } as never);
    await permanentlyDeleteEmployee(request() as never, response(), jest.fn());
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(2);
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith(base.avatarOriginalPublicId);
  });

  it("rejects an original file without a corresponding display image", async () => {
    const res = response(), next = jest.fn();
    await validateEmployeeUpdateUpload(request({ name: base.name }, { avatarOriginal: [upload("new-source")] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(deleteCloudinaryAsset).toHaveBeenCalledWith("asia-portal/avatars/new-source");
    expect(next).not.toHaveBeenCalled();
  });

  it("cleans both files after invalid input even if one deletion fails", async () => {
    jest.mocked(deleteCloudinaryAsset).mockRejectedValueOnce(new Error("storage failure"));
    const res = response();
    await validateEmployeeCreateUpload(request({}, { avatar: [upload("new-crop")], avatarOriginal: [upload("new-source")] }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(deleteCloudinaryAsset).toHaveBeenCalledTimes(2);
  });
});
