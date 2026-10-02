import type { NextFunction, Request, Response } from "express";

import { adminDashboardService } from "../../services/admin/dashboard.service";

export async function getDashboardSummary(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await adminDashboardService.getSummary();
    response.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}
