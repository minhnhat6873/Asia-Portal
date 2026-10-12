import Joi from "joi";
import { createMeetingBookingSchema, meetingBookingListQuerySchema } from "../user/meeting.validate";

const fields = ["title", "organizer", "email", "department", "roomId", "date", "start", "durationMinutes", "attendees"];
export const adminCreateMeetingSchema = createMeetingBookingSchema;
export const adminUpdateMeetingSchema = createMeetingBookingSchema.fork(fields, (field) => field.optional()).min(1);
export const adminMeetingQuerySchema = meetingBookingListQuerySchema.keys({
  status: Joi.string().valid("upcoming", "ongoing", "ended"),
  source: Joi.string().valid("active", "history"),
  sort: Joi.string().valid("asc", "desc"),
}).custom((value, helpers) => value.dateFrom && value.dateTo && value.dateFrom > value.dateTo
  ? helpers.message({ custom: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." }) : value);
export const meetingRequestQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});
