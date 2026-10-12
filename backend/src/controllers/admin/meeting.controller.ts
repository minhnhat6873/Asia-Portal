import type { NextFunction, Request, Response } from "express";
import type { AdminMeetingInput, AdminMeetingQuery, MeetingRequestQuery } from "../../interfaces/admin-meeting.interface";
import type { AuditAction } from "../../interfaces/audit-log.interface";
import { adminMeetingService } from "../../services/admin/meeting.service";
import { auditLogService } from "../../services/admin/audit-log.service";

async function audit(admin: Request["admin"], action: AuditAction, id: string, metadata: Record<string, unknown>) {
  if (!admin) return;
  await auditLogService.record({
    actor: { accountId: admin.id, name: admin.name, email: admin.email },
    action, entityType: "meeting", entityId: id, description: `Quản trị lịch họp: ${action}`,
    metadata,
  });
}

export async function listMeetings(request: Request<unknown, unknown, unknown, AdminMeetingQuery>, response: Response, next: NextFunction) {
  try { response.json({ success: true, message: "Danh sách lịch họp.", data: await adminMeetingService.list(request.query) }); }
  catch (error) { next(error); }
}
export async function meetingSummary(request: Request<unknown, unknown, unknown, AdminMeetingQuery>, response: Response, next: NextFunction) {
  try { response.json({ success: true, message: "Thống kê lịch họp.", data: await adminMeetingService.summary(request.query) }); }
  catch (error) { next(error); }
}
export async function getMeeting(request: Request<{ id: string }>, response: Response, next: NextFunction) {
  try { response.json({ success: true, message: "Chi tiết lịch họp.", data: await adminMeetingService.getById(request.params.id) }); }
  catch (error) { next(error); }
}
export async function createMeeting(request: Request<unknown, unknown, AdminMeetingInput>, response: Response, next: NextFunction) {
  try {
    const data = await adminMeetingService.create(request.body);
    await audit(request.admin, "meeting.created", data.id, { after: data });
    response.status(201).json({ success: true, message: "Đã tạo lịch họp.", data });
  } catch (error) { next(error); }
}
export async function updateMeeting(request: Request<{ id: string }, unknown, Partial<AdminMeetingInput>>, response: Response, next: NextFunction) {
  try {
    const data = await adminMeetingService.update(request.params.id, request.body);
    await audit(request.admin, "meeting.updated", request.params.id, data);
    response.json({ success: true, message: "Đã cập nhật lịch họp.", data: data.after });
  } catch (error) { next(error); }
}
export async function deleteMeeting(request: Request<{ id: string }>, response: Response, next: NextFunction) {
  try {
    const data = await adminMeetingService.remove(request.params.id);
    await audit(request.admin, "meeting.deleted", request.params.id, { before: data });
    response.json({ success: true, message: "Đã xóa lịch họp.", data });
  } catch (error) { next(error); }
}
export function listMeetingRequests(kind: "pending" | "cancel") {
  return async (request: Request<unknown, unknown, unknown, MeetingRequestQuery>, response: Response, next: NextFunction) => {
    try { response.json({ success: true, message: "Danh sách yêu cầu xác thực.", data: await adminMeetingService.requests(kind, request.query) }); }
    catch (error) { next(error); }
  };
}
export function revokeMeetingRequest(kind: "pending" | "cancel") {
  return async (request: Request<{ id?: string; bookingId?: string }>, response: Response, next: NextFunction) => {
    try {
      const id = (kind === "pending" ? request.params.id : request.params.bookingId)!;
      const data = await adminMeetingService.revoke(kind, id);
      await audit(request.admin, kind === "pending" ? "meeting.pending_revoked" : "meeting.cancel_request_revoked", id, { requestType: kind });
      response.json({ success: true, message: "Đã thu hồi yêu cầu xác thực.", data });
    } catch (error) { next(error); }
  };
}
