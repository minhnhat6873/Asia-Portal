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

type CloudinaryUploadedFile = Express.Multer.File & {
  secure_url?: string;
};

interface AuditedEmployee {
  _id?: unknown;
  employeeCode: string;
  name: string;
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
    response.status(200).json({ success: true, data: result });
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
    response.status(200).json({ success: true, data: employee });
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
    response.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(
  request: Request<unknown, unknown, CreateEmployeeInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const uploadedFile = request.file as CloudinaryUploadedFile | undefined;
  const avatar = uploadedFile?.secure_url ?? uploadedFile?.path ?? "";

  try {
    const employee = await adminEmployeeService.createEmployee({
      ...request.body,
      avatar,
      avatarPublicId: uploadedFile?.filename ?? "",
      createdBy: request.admin
        ? { accountId: request.admin.id, name: request.admin.name, email: request.admin.email }
        : undefined,
    });
    await recordEmployeeAudit(request.admin, "employee.created", employee);
    response.status(201).json({
      success: true,
      message: "T\u1ea1o nh\u00e2n vi\u00ean th\u00e0nh c\u00f4ng",
      data: employee,
    });
  } catch (error) {
    try {
      await deleteCloudinaryAsset(uploadedFile?.filename);
    } catch {
      // Keep the original create error as the API response.
    }
    next(error);
  }
}

export async function updateEmployee(
  request: Request<{ id: string }, unknown, UpdateEmployeeInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const uploadedFile = request.file as CloudinaryUploadedFile | undefined;
  const avatar = uploadedFile?.secure_url ?? uploadedFile?.path;

  try {
    const previousEmployee = uploadedFile
      ? await adminEmployeeService.getEmployeeById(request.params.id)
      : undefined;
    const employee = await adminEmployeeService.updateEmployee(
      request.params.id,
      avatar
        ? { ...request.body, avatar, avatarPublicId: uploadedFile?.filename ?? "" }
        : request.body,
    );
    const previousAvatarPublicId = previousEmployee?.avatarPublicId
      || getCloudinaryPublicIdFromUrl(previousEmployee?.avatar);
    if (uploadedFile && previousAvatarPublicId) {
      try {
        await deleteCloudinaryAsset(previousAvatarPublicId);
      } catch (cleanupError) {
        console.error("Không thể xóa ảnh đại diện cũ trên Cloudinary", cleanupError);
      }
    }
    await recordEmployeeAudit(request.admin, "employee.updated", employee, {
      changedFields: Object.keys(request.body),
      avatarChanged: Boolean(uploadedFile),
    });
    response.status(200).json({
      success: true,
      message: "C\u1eadp nh\u1eadt nh\u00e2n vi\u00ean th\u00e0nh c\u00f4ng",
      data: employee,
    });
  } catch (error) {
    try {
      await deleteCloudinaryAsset(uploadedFile?.filename);
    } catch {
      // Keep the original update error as the API response.
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
      data: employee,
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
      data: employee,
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
    const avatarPublicId = employee.avatarPublicId || getCloudinaryPublicIdFromUrl(employee.avatar);
    if (avatarPublicId) {
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
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}
