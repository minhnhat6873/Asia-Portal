import type { NextFunction, Request, Response } from "express";

import { deleteCloudinaryAsset, getCloudinaryPublicIdFromUrl } from "../../helpers/multerCloudinary.helper";
import type { AuditAction } from "../../interfaces/audit-log.interface";
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "../../interfaces/employee.interface";
import { adminEmployeeService } from "../../services/admin/employee.service";
import { auditLogService } from "../../services/admin/audit-log.service";
import { AppError } from "../../utils/errors/AppError";
import { presentEmployee } from "../../utils/employee/presentEmployee";
import { deleteEmployeeAvatarUploads, employeeAvatarAssetIds, getEmployeeAvatarUploads } from "../../utils/employee/avatarUploads";

type CloudinaryUploadedFile = Express.Multer.File & {
  secure_url?: string;
};

interface AuditedEmployee {
  _id?: unknown;
  employeeCode: string;
  name: string;
}

export async function importEmployees(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.admin) throw new AppError(401, "Vui lòng đăng nhập lại.");
    const actor = { accountId: request.admin.id, name: request.admin.name, email: request.admin.email };
    const employees = await adminEmployeeService.importEmployees(request.body.rows, actor);
    for (const employee of employees) await recordEmployeeAudit(request.admin, "employee.created", employee, { source: "excel_import" });
    response.status(201).json({ success: true, message: "Nhập nhân viên thành công", data: { count: employees.length } });
  } catch (error) { next(error); }
}

async function recordEmployeeAudit(
  admin: Request["admin"],
  action: AuditAction,
  employee: AuditedEmployee,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!admin) return;
  await auditLogService.record({
    actor: {
      accountId: admin.id,
      name: admin.name,
      email: admin.email,
    },
    action,
    entityType: "employee",
    entityId: String(employee._id ?? ""),
    description: `${employee.name} (${employee.employeeCode})`,
    metadata,
  });
}

export async function getEmployees(
  request: Request<unknown, unknown, unknown, EmployeeListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adminEmployeeService.getEmployees(request.query);
    response.status(200).json({ success: true, data: { ...result, items: result.items.map((employee) => presentEmployee(employee, request.admin?.permissions)) } });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await adminEmployeeService.getEmployeeById(request.params.id);
    response.status(200).json({ success: true, data: presentEmployee(employee, request.admin?.permissions) });
  } catch (error) {
    next(error);
  }
}

export async function getDeletedEmployees(
  request: Request<unknown, unknown, unknown, EmployeeListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adminEmployeeService.getDeletedEmployees(request.query);
    response.status(200).json({ success: true, data: { ...result, items: result.items.map((employee) => presentEmployee(employee, request.admin?.permissions)) } });
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(
  request: Request<unknown, unknown, CreateEmployeeInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const { avatar: uploadedFile, original: originalFile } = getEmployeeAvatarUploads(request);
  const avatar = uploadedFile?.secure_url ?? uploadedFile?.path ?? "";
  let uploadPersisted = false;

  try {
    const employee = await adminEmployeeService.createEmployee({
      ...request.body,
      avatar,
      avatarPublicId: uploadedFile?.filename ?? "",
      avatarOriginal: originalFile?.secure_url ?? originalFile?.path ?? avatar,
      avatarOriginalPublicId: originalFile?.filename ?? uploadedFile?.filename ?? "",
      createdBy: request.admin
        ? { accountId: request.admin.id, name: request.admin.name, email: request.admin.email }
        : undefined,
    });
    uploadPersisted = true;
    await recordEmployeeAudit(request.admin, "employee.created", employee);
    response.status(201).json({
      success: true,
      message: "T\u1ea1o nh\u00e2n vi\u00ean th\u00e0nh c\u00f4ng",
      data: presentEmployee(employee, request.admin?.permissions),
    });
  } catch (error) {
    if (!uploadPersisted) await deleteEmployeeAvatarUploads(request);
    next(error);
  }
}

export async function updateEmployee(
  request: Request<{ id: string }, unknown, UpdateEmployeeInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const { avatar: uploadedFile, original: originalFile } = getEmployeeAvatarUploads(request);
  const avatar = uploadedFile?.secure_url ?? uploadedFile?.path;
  const removingAvatar = !uploadedFile && request.body.avatar === "";
  let uploadPersisted = false;

  try {
    const previousEmployee = uploadedFile || removingAvatar
      ? await adminEmployeeService.getEmployeeById(request.params.id)
      : undefined;
    const changes: UpdateEmployeeInput = { ...request.body };
    if (avatar) {
      changes.avatar = avatar;
      changes.avatarPublicId = uploadedFile?.filename ?? "";
      if (originalFile) {
        changes.avatarOriginal = originalFile.secure_url ?? originalFile.path;
        changes.avatarOriginalPublicId = originalFile.filename;
      } else if (!previousEmployee?.avatarOriginal) {
        // Preserve the best available source for old records before replacing the crop.
        changes.avatarOriginal = previousEmployee?.avatar || avatar;
        changes.avatarOriginalPublicId = previousEmployee?.avatarPublicId
          || getCloudinaryPublicIdFromUrl(previousEmployee?.avatar)
          || uploadedFile?.filename || "";
      }
    } else if (removingAvatar) {
      changes.avatarPublicId = "";
      changes.avatarOriginal = "";
      changes.avatarOriginalPublicId = "";
    }
    const employee = await adminEmployeeService.updateEmployee(
      request.params.id,
      changes,
    );
    uploadPersisted = true;
    if (previousEmployee) {
      const retained = new Set(employeeAvatarAssetIds(employee));
      for (const id of employeeAvatarAssetIds(previousEmployee)) {
        if (retained.has(id)) continue;
        try {
          await deleteCloudinaryAsset(id);
        } catch (cleanupError) {
          console.error("Không thể xóa ảnh đại diện cũ trên Cloudinary", cleanupError);
        }
      }
    }
    await recordEmployeeAudit(request.admin, "employee.updated", employee, {
      changedFields: Object.keys(request.body),
      avatarChanged: Boolean(uploadedFile) || removingAvatar,
    });
    response.status(200).json({
      success: true,
      message: "C\u1eadp nh\u1eadt nh\u00e2n vi\u00ean th\u00e0nh c\u00f4ng",
      data: presentEmployee(employee, request.admin?.permissions),
    });
  } catch (error) {
    if (!uploadPersisted) await deleteEmployeeAvatarUploads(request);
    next(error);
  }
}

export async function updateEmployeeChartAvatar(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const uploadedFile = request.file as CloudinaryUploadedFile | undefined;
  if (!uploadedFile) {
    next(new AppError(400, "Vui l\u00f2ng ch\u1ecdn \u1ea3nh s\u01a1 \u0111\u1ed3."));
    return;
  }

  let uploadPersisted = false;
  try {
    const previousEmployee = await adminEmployeeService.getEmployeeById(request.params.id);
    if (!["CEO", "Senior Management"].includes(previousEmployee.rank ?? "")) {
      try { await deleteCloudinaryAsset(uploadedFile.filename); } catch {}
      response.status(400).json({ success: false, message: "Chỉ CEO hoặc Quản lý cấp cao mới có ảnh sơ đồ." });
      return;
    }

    const chartAvatar = uploadedFile.secure_url ?? uploadedFile.path;
    const employee = await adminEmployeeService.updateEmployee(request.params.id, {
      chartAvatar,
      chartAvatarPublicId: uploadedFile.filename,
    });
    uploadPersisted = true;
    const previousPublicId = previousEmployee.chartAvatarPublicId
      || getCloudinaryPublicIdFromUrl(previousEmployee.chartAvatar);
    if (previousPublicId) {
      try { await deleteCloudinaryAsset(previousPublicId); } catch (cleanupError) {
        console.error("Kh\u00f4ng th\u1ec3 x\u00f3a \u1ea3nh s\u01a1 \u0111\u1ed3 c\u0169 tr\u00ean Cloudinary", cleanupError);
      }
    }
    await recordEmployeeAudit(request.admin, "employee.updated", employee, { chartAvatarChanged: true });
    response.status(200).json({ success: true, message: "\u0110\u00e3 l\u01b0u \u1ea3nh s\u01a1 \u0111\u1ed3", data: presentEmployee(employee, request.admin?.permissions) });
  } catch (error) {
    if (!uploadPersisted) {
      try { await deleteCloudinaryAsset(uploadedFile.filename); } catch {}
    }
    next(error);
  }
}

export async function softDeleteEmployee(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await adminEmployeeService.softDeleteEmployee(
      request.params.id,
      request.admin
        ? { accountId: request.admin.id, name: request.admin.name, email: request.admin.email }
        : undefined,
    );
    await recordEmployeeAudit(request.admin, "employee.soft_deleted", employee);
    response.status(200).json({
      success: true,
      message: "Đã chuyển nhân viên vào thùng rác",
      data: presentEmployee(employee, request.admin?.permissions),
    });
  } catch (error) {
    next(error);
  }
}
export async function restoreEmployee(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await adminEmployeeService.restoreEmployee(request.params.id);
    await recordEmployeeAudit(request.admin, "employee.restored", employee);
    response.status(200).json({
      success: true,
      message: "Đã khôi phục nhân viên",
      data: presentEmployee(employee, request.admin?.permissions),
    });
  } catch (error) {
    next(error);
  }
}

export async function permanentlyDeleteEmployee(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await adminEmployeeService.permanentlyDeleteEmployee(request.params.id);
    const chartAvatarPublicId = employee.chartAvatarPublicId || getCloudinaryPublicIdFromUrl(employee.chartAvatar);
    const avatarIds = new Set([...employeeAvatarAssetIds(employee), chartAvatarPublicId].filter((id): id is string => Boolean(id)));
    for (const avatarPublicId of avatarIds) {
      try {
        await deleteCloudinaryAsset(avatarPublicId);
      } catch (cleanupError) {
        console.error("Không thể xóa ảnh đại diện trên Cloudinary", cleanupError);
      }
    }
    await recordEmployeeAudit(request.admin, "employee.permanently_deleted", employee);
    response.status(200).json({
      success: true,
      message: "Đã xóa vĩnh viễn nhân viên",
      data: presentEmployee(employee, request.admin?.permissions),
    });
  } catch (error) {
    next(error);
  }
}
