import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export type MeetingStatus = "upcoming" | "ongoing" | "ended";
export type MeetingSource = "active" | "history";
export type AdminMeetingTab = "active" | "history" | "pending" | "cancellations";

export interface AdminMeeting {
  id: string;
  source: MeetingSource;
  status: MeetingStatus;
  title: string;
  organizer: string;
  email: string;
  department: string;
  roomId: "room-01" | "room-02";
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  attendees: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingRequest {
  id: string;
  bookingId?: string;
  title?: string;
  organizer?: string;
  email: string;
  department?: string;
  roomId?: "room-01" | "room-02";
  date?: string;
  start?: string;
  end?: string;
  attendees?: number;
  createdAt?: string;
  otpExpiresAt: string;
  expired: boolean;
}

export interface Paged<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface MeetingFilters {
  search?: string;
  roomId?: "room-01" | "room-02";
  department?: string;
  status?: MeetingStatus;
  dateFrom?: string;
  dateTo?: string;
  source?: MeetingSource;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}

export interface MeetingSummary {
  total: number;
  today: number;
  ongoing: number;
  ended: number;
  departmentCount: number;
  room01: number;
  room02: number;
  pendingOtp: number;
}

export type AdminMeetingInput = Pick<AdminMeeting, "title" | "organizer" | "email" | "department" | "roomId" | "date" | "start" | "durationMinutes" | "attendees">;

function toQuery(filters: Partial<MeetingFilters>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.size ? `?${params.toString()}` : "";
}

export function getAdminMeetings(filters: MeetingFilters, signal?: AbortSignal) {
  return apiGet<Paged<AdminMeeting>>(`/admin/meetings${toQuery(filters)}`, signal);
}

export function getAdminMeetingSummary(filters: Omit<MeetingFilters, "page" | "limit" | "sort">, signal?: AbortSignal) {
  return apiGet<MeetingSummary>(`/admin/meetings/summary${toQuery(filters)}`, signal);
}

export function getAdminMeetingRequests(kind: "pending" | "cancel-requests", page = 1, limit = 10, signal?: AbortSignal) {
  return apiGet<Paged<MeetingRequest>>(`/admin/meetings/${kind}${toQuery({ page, limit })}`, signal);
}

export function getAdminMeeting(id: string, signal?: AbortSignal) {
  return apiGet<AdminMeeting>(`/admin/meetings/${encodeURIComponent(id)}`, signal);
}

export function deleteAdminMeeting(id: string) {
  return apiDelete<AdminMeeting>(`/admin/meetings/${encodeURIComponent(id)}`);
}

export function createAdminMeeting(input: AdminMeetingInput) {
  return apiPost<AdminMeeting>("/admin/meetings", input);
}

export function updateAdminMeeting(id: string, input: Partial<AdminMeetingInput>) {
  return apiPatch<AdminMeeting>(`/admin/meetings/${encodeURIComponent(id)}`, input);
}

export function revokeAdminMeetingRequest(kind: "pending" | "cancel-requests", id: string) {
  const segment = kind === "pending" ? `pending/${id}` : `cancel-requests/${id}`;
  return apiDelete<{ id: string; revoked: boolean }>(`/admin/meetings/${segment}`);
}
