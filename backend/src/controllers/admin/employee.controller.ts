import type { NextFunction, Request, Response } from "express";

import { deleteCloudinaryAsset } from "../../helpers/multerCloudinary.helper";
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "../../interfaces/employee.interface";
import { adminEmployeeService } from "../../services/admin/employee.service";

type CloudinaryUploadedFile = Express.Multer.File & {
  secure_url?: string;
};

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
      createdBy: request.admin
        ? { accountId: request.admin.id, name: request.admin.name, email: request.admin.email }
        : undefined,
    });
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
    const employee = await adminEmployeeService.updateEmployee(
      request.params.id,
      avatar ? { ...request.body, avatar } : request.body,
    );
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
