import { apiDelete, apiGet, apiPatch, apiPost, apiPostFormData } from "./api";

export type VehiclePurpose = "guest" | "delivery";
export type VehicleType = "company" | "external";
export type VehicleStatus = "pending" | "arranged" | "arrived" | "completed" | "cancelled";

export const VEHICLE_PURPOSE_LABELS: Record<VehiclePurpose, string> = { guest: "Đón/đưa khách", delivery: "Giao/nhận hàng" };
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = { company: "Xe công ty", external: "Xe ngoài (Grab)" };
/** Warning next to a requester whose account no longer works (admin portal). */
export const REQUESTER_GONE = { locked: "Tài khoản người đặt đã bị khóa", deleted: "Tài khoản người đặt đã bị xóa" } as const;

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  pending: "Chờ xử lý",
  arranged: "Đã sắp xếp xe",
  arrived: "Chờ HR xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
export const VEHICLE_STATUS_TONES: Record<VehicleStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  arranged: "bg-sky-50 text-sky-700 ring-sky-200",
  arrived: "bg-violet-50 text-violet-700 ring-violet-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};
/** Requests must be sent at least this long before departure (same as the server). */
export { VEHICLE_MIN_LEAD_MINUTES } from "@/lib/vehicleValidation";

/** Pickup position from the requester's device (GPS); accuracy in metres. */
export interface VehicleLocation { lat: number; lng: number; accuracy: number | null }
export const mapLink = (location: VehicleLocation) => `https://www.google.com/maps?q=${location.lat},${location.lng}`;

export interface VehicleTrip {
  id: string;
  requester: { accountId: string; name: string; email: string; department: string };
  /** Admin portal only: the requester's account no longer works (their open trips were cancelled). */
  requesterStatus?: "active" | "locked" | "deleted";
  /** Booked for someone else (name and phone of that person). */
  forOther: boolean;
  forOtherName: string;
  forOtherPhone: string;
  purpose: VehiclePurpose;
  customerName: string;
  customerPhone: string;
  passengerCount: number | null;
  goodsDescription: string;
  goodsQuantity: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  pickup: string;
  pickupLocation: VehicleLocation | null;
  destination: string;
  extraDestinations?: string[];
  departAt: string;
  roundTrip: boolean;
  returnAt: string | null;
  /** Set by HR when arranging the car. */
  expectedEndAt: string | null;
  note: string;
  status: VehicleStatus;
  vehicleType: VehicleType | null;
  driverName: string;
  driverPlate: string;
  driverPhone: string;
  estimatedCost: number | null;
  actualCost: number | null;
  receipts: { url: string; uploadedBy: "requester" | "hr"; at: string }[];
  /** Pictures the requester sent with the request (goods, notes). */
  attachments: { url: string; uploadedBy: "requester" | "hr"; at: string }[];
  /** Times or places HR changed from the request, with the reason sent to the requester. */
  changes: VehicleChange[];
  arrangedBy: { name: string } | null;
  arrivedAt: string | null;
  /** When the trip really ended (entered by HR when closing it). */
  actualEndAt: string | null;
  completedAt: string | null;
  completedBy: { name: string } | null;
  cancel: { byName: string; byRequester: boolean; reason: string; at: string } | null;
  createdAt?: string;
}

/** Form values; times are Vietnam local "YYYY-MM-DDTHH:mm". */
export interface VehicleRequestInput {
  /** false: for the signed-in account itself; true: name and phone below are required. */
  forOther: boolean;
  forOtherName: string;
  forOtherPhone: string;
  purpose: VehiclePurpose;
  customerName: string;
  customerPhone: string;
  passengerCount: number | null;
  goodsDescription: string;
  /** Deliveries: amount or weight, free text ("15 thùng", "500 kg"). */
  goodsQuantity: string;
  /** Deliveries: both sides with a phone number (required). */
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  pickup: string;
  pickupLocation: VehicleLocation | null;
  destination: string;
  extraDestinations?: string[];
  departAt: string;
  roundTrip: boolean;
  returnAt: string | null;
  note: string;
}

export interface VehicleChange { at: string; byName: string; reason: string; items: { label: string; from: string; to: string }[] }

export interface VehicleArrangeInput extends Partial<VehicleRequestInput> {
  /** Required when the time or route differs from the request. */
  changeReason?: string;
  expectedEndAt?: string;
  vehicleType?: VehicleType;
  driverName?: string;
  driverPlate?: string;
  driverPhone?: string;
  estimatedCost?: number | null;
}

export interface VehicleReport {
  month: string;
  /** One month, the whole company: external cars (trips, money) and company cars (trips only). */
  totals: { externalTrips: number; externalCost: number; companyTrips: number; notClosed: number };
  trips: VehicleTrip[];
}

const VN_TIME = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
export const formatTripTime = (value?: string | null) => (value ? VN_TIME.format(new Date(value)) : "—");
export const formatVnd = (value?: number | null) => (value == null ? "—" : `${value.toLocaleString("vi-VN")} đ`);

/** ISO time -> "YYYY-MM-DDTHH:mm" in Vietnam time (form values). */
export function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function receiptsForm(files: File[], fields: Record<string, string> = {}) {
  const body = new FormData();
  files.forEach((file) => body.append("receipts", file));
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  return body;
}

// ---- requester (user portal) ----
/** Max pictures sent with a new request (same as the server). */
export const VEHICLE_MAX_ATTACHMENTS = 3;
/** With pictures: multipart, the request as JSON in field "payload" and the files in "attachments". */
export function requestVehicle(input: VehicleRequestInput, files: File[] = []) {
  if (!files.length) return apiPost<VehicleTrip>("/user/vehicles", input);
  const body = new FormData();
  body.append("payload", JSON.stringify(input));
  files.forEach((file) => body.append("attachments", file));
  return apiPostFormData<VehicleTrip>("/user/vehicles", body);
}
export const getMyTrips = (signal?: AbortSignal) => apiGet<VehicleTrip[]>("/user/vehicles/mine", signal);
export const updateMyTrip = (id: string, input: Partial<VehicleRequestInput>) => apiPatch<VehicleTrip>(`/user/vehicles/${encodeURIComponent(id)}`, input);
export const cancelMyTrip = (id: string, reason = "") => apiPost<VehicleTrip>(`/user/vehicles/${encodeURIComponent(id)}/cancel`, { reason });
export const markTripArrived = (id: string, files: File[]) => apiPostFormData<VehicleTrip>(`/user/vehicles/${encodeURIComponent(id)}/arrived`, receiptsForm(files));

// ---- HR (admin portal) ----
export interface VehicleListParams { status?: VehicleStatus; vehicleType?: VehicleType; purpose?: VehiclePurpose; month?: string; dateFrom?: string; dateTo?: string; search?: string; page?: number; limit?: number }
export function listVehicleTrips(params: VehicleListParams, signal?: AbortSignal) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return apiGet<{ items: VehicleTrip[]; pagination: { page: number; limit: number; total: number; totalPages: number }; waiting: number }>(`/admin/vehicles${query.size ? `?${query}` : ""}`, signal);
}
export const getVehicleTrip = (id: string, signal?: AbortSignal) => apiGet<VehicleTrip>(`/admin/vehicles/${encodeURIComponent(id)}`, signal);
export const arrangeVehicleTrip = (id: string, input: VehicleArrangeInput) => apiPatch<VehicleTrip>(`/admin/vehicles/${encodeURIComponent(id)}`, input);
/** actualEndAt: Vietnam local "YYYY-MM-DDTHH:mm". */
export const completeVehicleTrip = (id: string, result: { actualCost: number | null; actualEndAt: string }, files: File[]) =>
  apiPostFormData<VehicleTrip>(`/admin/vehicles/${encodeURIComponent(id)}/complete`, receiptsForm(files, {
    actualEndAt: result.actualEndAt,
    ...(result.actualCost ? { actualCost: String(result.actualCost) } : {}),
  }));
export const cancelVehicleTrip = (id: string, reason: string) => apiPost<VehicleTrip>(`/admin/vehicles/${encodeURIComponent(id)}/cancel`, { reason });
export const deleteVehicleTrip = (id: string) => apiDelete<{ id: string }>(`/admin/vehicles/${encodeURIComponent(id)}`);
export const getVehicleReport = (month: string, signal?: AbortSignal) => apiGet<VehicleReport>(`/admin/vehicles/report?month=${encodeURIComponent(month)}`, signal);
export const vehicleReportExportUrl = (month: string) => `/backend-api/admin/vehicles/report/export?month=${encodeURIComponent(month)}`;
