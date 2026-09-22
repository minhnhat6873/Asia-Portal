import type { NextFunction, Request, Response } from "express";

import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput,
} from "../interfaces/employee.interface";
import { employeeService } from "../services/employee.service";

export async function getPublicEmployees(
  request: Request<unknown, unknown, unknown, EmployeeListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await employeeService.getEmployees({
      ...request.query,
      status: "active",
    });
    response.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPublicEmployeeById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await employeeService.getEmployeeById(
      request.params.id,
      true,
    );
    response.status(200).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
}

export async function getAdminEmployees(
  request: Request<unknown, unknown, unknown, EmployeeListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await employeeService.getEmployees(request.query);
    response.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getAdminEmployeeById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await employeeService.getEmployeeById(request.params.id);
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
  try {
    const employee = await employeeService.createEmployee(request.body);
    response.status(201).json({
      success: true,
      message: "Tạo nhân viên thành công",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployee(
  request: Request<{ id: string }, unknown, UpdateEmployeeInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await employeeService.updateEmployee(
      request.params.id,
      request.body,
    );
    response.status(200).json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
}