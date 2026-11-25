import type { NextFunction, Request, Response } from "express";

import type { VehicleListQuery } from "../interfaces/vehicle-booking.interface";
import { hrVehicleService, userVehicleService, type UploadedReceipt } from "../services/vehicle/vehicle-booking.service";
import { buildVehicleReportWorkbook } from "../services/vehicle/vehicle-report.export";

type Handler = (request: Request, response: Response, next: NextFunction) => Promise<void>;
const handle = (work: (request: Request, response: Response) => Promise<unknown>, message?: string, status = 200): Handler =>
  async (request, response, next) => {
    try {
      const data = await work(request, response);
      response.status(status).json({ success: true, ...(message ? { message } : {}), data });
    } catch (error) { next(error); }
  };

/** Files stored by multer-storage-cloudinary (path = url, filename = public id). */
function uploadedReceipts(request: Request): UploadedReceipt[] {
  const files = (Array.isArray(request.files) ? request.files : []) as (Express.Multer.File & { path?: string; filename?: string })[];
  return files.filter((file) => file.path && file.filename).map((file) => ({ url: file.path!, publicId: file.filename! }));
}
const id = (request: Request) => String(request.params.id);

// ---- requester (user portal; request.user set by requireUserAuth) ----
export const createVehicleRequest = handle((request) => userVehicleService.create(request.user!, request.body), "Đã gửi yêu cầu đặt xe. HR sẽ sắp xếp xe cho bạn.", 201);
export const getMyVehicleRequests = handle((request) => userVehicleService.mine(request.user!));
export const updateMyVehicleRequest = handle((request) => userVehicleService.update(request.user!, id(request), request.body), "Đã cập nhật yêu cầu đặt xe.");
export const cancelMyVehicleRequest = handle((request) => userVehicleService.cancel(request.user!, id(request), request.body.reason), "Đã hủy yêu cầu đặt xe.");
export const markMyTripArrived = handle((request) => userVehicleService.markArrived(request.user!, id(request), uploadedReceipts(request)), "Đã báo HR chuyến xe đã đi xong.");

// ---- HR (admin portal; "vehicles:manage") ----
export const listVehicleBookings = handle((request) => hrVehicleService.list(request.query as VehicleListQuery));
export const getVehicleBooking = handle((request) => hrVehicleService.get(id(request)));
export const arrangeVehicleBooking = handle((request) => hrVehicleService.arrange(request.admin!, id(request), request.body), "Đã lưu chuyến xe.");
export const completeVehicleBooking = handle((request) => hrVehicleService.complete(request.admin!, id(request), { actualCost: request.body.actualCost === "" ? null : request.body.actualCost, actualEndAt: request.body.actualEndAt }, uploadedReceipts(request)), "Đã chốt chuyến xe.");
export const cancelVehicleBooking = handle((request) => hrVehicleService.cancel(request.admin!, id(request), request.body.reason), "Đã hủy chuyến xe.");
export const deleteVehicleBooking = handle((request) => hrVehicleService.remove(id(request)), "Đã xóa chuyến xe.");
export const getVehicleReport = handle((request) => hrVehicleService.report(String(request.query.month)));

export async function exportVehicleReport(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const month = String(request.query.month);
    const buffer = await buildVehicleReportWorkbook(await hrVehicleService.report(month));
    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="chi-phi-xe-${month}.xlsx"`);
    response.setHeader("Cache-Control", "no-store");
    response.send(buffer);
  } catch (error) { next(error); }
}
