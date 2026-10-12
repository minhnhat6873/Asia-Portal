import { isValidObjectId } from "mongoose";
import type { AdminMeetingInput, AdminMeetingQuery, MeetingRequestQuery } from "../../interfaces/admin-meeting.interface";
import type { MeetingBooking } from "../../interfaces/meeting.interface";
import { adminMeetingRepository } from "../../repositories/admin/meeting.repository";
import { meetingBookingRepository } from "../../repositories/user/meeting-booking.repository";
import { validateBookingInput } from "../../utils/meeting/validateBooking";
import { AppError } from "../../utils/errors/AppError";
import { escapeRegex } from "../../utils/regex/escapeRegex";
import { getVietnamDateTimeAsUtc, getVietnamNow } from "../../utils/time/vietnamTime";
import { MIN_MEETING_GAP_MINUTES } from "../../config/meeting.config";

const VIETNAMESE_LETTER_GROUPS: Record<string, string> = {
  a: "aáàảãạăắằẳẵặâấầẩẫậ",
  d: "dđ",
  e: "eéèẻẽẹêếềểễệ",
  i: "iíìỉĩị",
  o: "oóòỏõọôốồổỗộơớờởỡợ",
  u: "uúùủũụưứừửữự",
  y: "yýỳỷỹỵ",
};

function accentInsensitivePattern(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d");
  return [...normalized].map((character) => {
    const group = VIETNAMESE_LETTER_GROUPS[character.toLowerCase()];
    return group ? `[${group}]` : escapeRegex(character);
  }).join("");
}

function validId(id: string) {
  if (!isValidObjectId(id)) throw new AppError(400, "Mã lịch/yêu cầu không hợp lệ.");
}
function statusOf(booking: MeetingBooking, now = new Date()) {
  if (getVietnamDateTimeAsUtc(booking.date, booking.end) <= now) return "ended";
  return getVietnamDateTimeAsUtc(booking.date, booking.start) <= now ? "ongoing" : "upcoming";
}
function toResponse(booking: MeetingBooking & { _id?: unknown; originalBookingId?: unknown; source?: string; status?: string }, source = booking.source ?? "active") {
  return {
    id: String(booking.originalBookingId ?? booking._id), source,
    status: source === "history" ? "ended" : booking.status ?? statusOf(booking),
    title: booking.title, organizer: booking.organizer, email: booking.email,
    department: booking.department, roomId: booking.roomId, date: booking.date,
    start: booking.start, end: booking.end, attendees: booking.attendees,
    durationMinutes: (getVietnamDateTimeAsUtc(booking.date, booking.end).getTime() - getVietnamDateTimeAsUtc(booking.date, booking.start).getTime()) / 60000,
    createdAt: booking.createdAt, updatedAt: booking.updatedAt,
  };
}
function filterFor(query: AdminMeetingQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.dateFrom || query.dateTo) filter.date = { ...(query.dateFrom ? { $gte: query.dateFrom } : {}), ...(query.dateTo ? { $lte: query.dateTo } : {}) };
  for (const key of ["roomId", "department", "status", "source"] as const) if (query[key]) filter[key] = query[key];
  if (query.search?.trim()) {
    const expression = new RegExp(accentInsensitivePattern(query.search.trim()), "i");
    filter.$or = ["title", "organizer", "email", "department"].map((field) => ({ [field]: expression }));
  }
  return filter;
}
function pagination(query: MeetingRequestQuery, max = 100) {
  return { page: Math.max(Number(query.page) || 1, 1), limit: Math.min(Math.max(Number(query.limit) || 20, 1), max) };
}
function validated(input: AdminMeetingInput, future = true): MeetingBooking {
  const { email, end, organizer } = validateBookingInput(input, future);
  return { title: input.title.trim(), organizer, email, department: input.department.trim(), roomId: input.roomId, date: input.date, start: input.start, end, attendees: input.attendees };
}
function conflict(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    throw new AppError(409, "Phòng đã có lịch trùng hoặc chưa đủ khoảng nghỉ giữa các cuộc họp.");
  }
  throw error;
}

export const adminMeetingService = {
  async list(query: AdminMeetingQuery) {
    const { page, limit } = pagination(query, 500);
    const [result] = await adminMeetingRepository.list(filterFor(query), page, limit, query.sort === "desc" ? -1 : 1, new Date());
    const total = result?.count[0]?.total ?? 0;
    return { items: (result?.items ?? []).map((booking: MeetingBooking) => toResponse(booking)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async summary(query: AdminMeetingQuery) {
    const now = new Date();
    const [statistics, pendingOtp] = await Promise.all([
      adminMeetingRepository.summary(filterFor(query), getVietnamNow(now).date, now), adminMeetingRepository.countPending(now),
    ]);
    return { ...(statistics[0] ?? { total: 0, today: 0, ongoing: 0, ended: 0, room01: 0, room02: 0, departmentCount: 0 }), pendingOtp,
      scope: { filters: filterFor(query), pendingOtp: "all-unexpired", timezone: "Asia/Ho_Chi_Minh", asOf: now } };
  },
  async getById(id: string) {
    validId(id);
    const history = await adminMeetingRepository.findHistory(id);
    if (history) return toResponse(history, "history");
    const booking = await adminMeetingRepository.findActive(id);
    if (!booking) throw new AppError(404, "Không tìm thấy lịch họp.");
    return toResponse(booking);
  },
  async create(input: AdminMeetingInput) {
    const data = validated(input);
    if (await meetingBookingRepository.findOverlapping(data.roomId, data.date, data.start, data.end)) throw new AppError(409, "Phòng đã được đặt trong khung giờ này hoặc chưa đủ khoảng nghỉ.");
    try {
      const booking = await meetingBookingRepository.create(data);
      if (!booking) throw new AppError(500, "Không thể tạo lịch họp.");
      return toResponse(booking);
    } catch (error) { return conflict(error); }
  },
  async update(id: string, input: Partial<AdminMeetingInput>) {
    validId(id);
    const booking = await adminMeetingRepository.findActive(id);
    if (!booking) {
      if (await adminMeetingRepository.findHistory(id)) throw new AppError(409, "Lịch sử chỉ được xem hoặc xóa.");
      throw new AppError(404, "Không tìm thấy lịch họp.");
    }
    const status = statusOf(booking);
    if (booking.archiveClaimedAt || status === "ended") throw new AppError(409, "Lịch đã kết thúc hoặc đang chuyển vào lịch sử.");
    const before = toResponse(booking);
    if (status === "ongoing" && (["roomId", "date", "start", "durationMinutes", "attendees"] as const).some((key) => input[key] !== undefined && input[key] !== before[key])) {
      throw new AppError(409, "Lịch đang họp chỉ được sửa tiêu đề, người chủ trì, email và phòng ban.");
    }
    const data = validated({ ...before, ...input }, status === "upcoming");
    if (await meetingBookingRepository.findOverlapping(data.roomId, data.date, data.start, data.end, MIN_MEETING_GAP_MINUTES, undefined, id)) throw new AppError(409, "Khung giờ mới trùng lịch hoặc chưa đủ khoảng nghỉ.");
    try {
      const updated = await adminMeetingRepository.update(booking, data, status === "upcoming");
      if (!updated) throw new AppError(409, "Lịch vừa thay đổi hoặc chuyển trạng thái. Vui lòng tải lại.");
      await adminMeetingRepository.revokeCancel(id);
      return { before, after: toResponse(updated) };
    } catch (error) { return conflict(error); }
  },
  async remove(id: string) {
    validId(id);
    const deleted = await adminMeetingRepository.deleteActive(id);
    if (!deleted && await adminMeetingRepository.findActive(id)) throw new AppError(409, "Lịch đang chuyển vào lịch sử. Vui lòng thử lại.");
    const history = await adminMeetingRepository.deleteHistory(id);
    if (!deleted && !history) throw new AppError(404, "Không tìm thấy lịch họp.");
    await adminMeetingRepository.revokeCancel(id);
    return deleted ? toResponse(deleted) : toResponse(history!, "history");
  },
  async requests(kind: "pending" | "cancel", query: MeetingRequestQuery) {
    const { page, limit } = pagination(query);
    const [records, total] = await adminMeetingRepository.requests(kind, (page - 1) * limit, limit);
    const now = new Date();
    return { items: records.map(({ _id, ...record }) => ({ ...record, id: String(_id), expired: record.otpExpiresAt <= now })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async revoke(kind: "pending" | "cancel", id: string) {
    validId(id);
    const request = kind === "pending" ? await adminMeetingRepository.revokePending(id) : await adminMeetingRepository.revokeCancel(id);
    if (!request) throw new AppError(404, "Yêu cầu không tồn tại hoặc đã được xử lý.");
    return { id, revoked: true };
  },
};
