import type { NextFunction, Request, Response } from "express";

import type { EmployeeListQuery } from "../../interfaces/employee.interface";
import { userEmployeeService } from "../../services/user/employee.service";

export async function getEmployees(
  request: Request<unknown, unknown, unknown, EmployeeListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await userEmployeeService.getEmployees(request.query);
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
    const employee = await userEmployeeService.getEmployeeById(request.params.id);
    response.status(200).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
}
