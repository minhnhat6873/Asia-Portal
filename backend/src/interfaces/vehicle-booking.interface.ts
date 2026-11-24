import type { Types } from "mongoose";

export const VEHICLE_PURPOSES = ["guest", "delivery"] as const;
export const VEHICLE_TYPES = ["company", "external"] as const;
/**
 * pending: sent by the requester; arranged: HR chose a car; arrived: the requester reported
 * the trip done and HR still has to close it; completed: closed by HR; cancelled: with a reason.
 */
export const VEHICLE_STATUSES = ["pending", "arranged", "arrived", "completed", "cancelled"] as const;

export type VehiclePurpose = (typeof VEHICLE_PURPOSES)[number];
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export interface VehiclePerson { accountId: string; name: string; email: string }
export interface VehicleReceipt { url: string; publicId: string; uploadedBy: "requester" | "hr"; at: Date }

export interface VehicleBooking {
  requester: VehiclePerson & { department: string };
  purpose: VehiclePurpose;
  /** Guest name/company; for deliveries it is "sender → receiver" (used in lists and reports). */
  customerName: string;
  customerPhone?: string;
  passengerCount?: number | null;
  goodsDescription?: string;
  /** Deliveries: both sides with a phone number (required). */
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  pickup: string;
  destination: string;
  departAt: Date;
  roundTrip: boolean;
  returnAt?: Date | null;
  expectedEndAt: Date;
  note?: string;
  status: VehicleStatus;
  vehicleType?: VehicleType | null;
  driverName?: string;
  driverPlate?: string;
  driverPhone?: string;
  /** VND, entered by HR for external cars. */
  estimatedCost?: number | null;
  actualCost?: number | null;
  receipts: VehicleReceipt[];
  arrangedBy?: VehiclePerson | null;
  arrivedAt?: Date | null;
  completedAt?: Date | null;
  completedBy?: VehiclePerson | null;
  cancel?: { by: VehiclePerson; byRequester: boolean; reason: string; at: Date } | null;
  /** Reminder bookkeeping (internal). */
  departReminderSentAt?: Date | null;
  hrOverdueNotifiedAt?: Date | null;
  hrOverdueEmailedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type StoredVehicleBooking = VehicleBooking & { _id: Types.ObjectId };

/** Form fields the requester fills in (times are Vietnam local "YYYY-MM-DDTHH:mm"). */
export interface VehicleRequestInput {
  purpose: VehiclePurpose;
  /** Guests only; deliveries use the sender and receiver fields. */
  customerName?: string;
  customerPhone?: string;
  passengerCount?: number | null;
  goodsDescription?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  pickup: string;
  destination: string;
  departAt: string;
  roundTrip: boolean;
  returnAt?: string | null;
  expectedEndAt: string;
  note?: string;
}

/** What HR may change: the trip details plus the car. */
export interface VehicleArrangeInput extends Partial<VehicleRequestInput> {
  vehicleType?: VehicleType;
  driverName?: string;
  driverPlate?: string;
  driverPhone?: string;
  estimatedCost?: number | null;
}

export interface VehicleListQuery {
  status?: VehicleStatus;
  vehicleType?: VehicleType;
  purpose?: VehiclePurpose;
  month?: string;
  search?: string;
  page?: string;
  limit?: string;
}
