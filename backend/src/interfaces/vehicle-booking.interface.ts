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
/** Device position at booking time (browser GPS). accuracy is in metres. */
export interface VehicleLocation { lat: number; lng: number; accuracy?: number | null }
/** HR changed what the requester asked for (time or route); the reason is sent to them. */
export interface VehicleChange {
  at: Date;
  by: VehiclePerson;
  reason: string;
  items: { label: string; from: string; to: string }[];
}
export interface VehicleReceipt { url: string; publicId: string; uploadedBy: "requester" | "hr"; at: Date }

export interface VehicleBooking {
  requester: VehiclePerson & { department: string };
  /** Booked for someone else: that person's name and phone (both required). */
  forOther?: boolean;
  forOtherName?: string;
  forOtherPhone?: string;
  purpose: VehiclePurpose;
  /** Guest name/company; for deliveries it is "sender → receiver" (used in lists and reports). */
  customerName: string;
  customerPhone?: string;
  passengerCount?: number | null;
  goodsDescription?: string;
  /** Deliveries: amount or weight, free text ("2 cont 40 feet", "15 thùng", "500 kg"). */
  goodsQuantity?: string;
  /** Deliveries: both sides with a phone number (required). */
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  pickup: string;
  /** Where the pickup is, taken from the requester's current position (optional). */
  pickupLocation?: VehicleLocation | null;
  destination: string;
  departAt: Date;
  roundTrip: boolean;
  returnAt?: Date | null;
  /** Set by HR when arranging the car (the requester cannot know it). */
  expectedEndAt?: Date | null;
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
  /** Changes HR made to the time or route, oldest first. */
  changes?: VehicleChange[];
  arrangedBy?: VehiclePerson | null;
  arrivedAt?: Date | null;
  /** When the trip really ended, entered by HR when closing it (completedAt is when HR clicked). */
  actualEndAt?: Date | null;
  completedAt?: Date | null;
  completedBy?: VehiclePerson | null;
  cancel?: { by: VehiclePerson; byRequester: boolean; reason: string; at: Date } | null;
  /** Reminder bookkeeping (internal). */
  departReminderSentAt?: Date | null;
  hrOverdueNotifiedAt?: Date | null;
  hrOverdueEmailedAt?: Date | null;
  pendingOverdueNotifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type StoredVehicleBooking = VehicleBooking & { _id: Types.ObjectId };

/** Form fields the requester fills in (times are Vietnam local "YYYY-MM-DDTHH:mm"). */
export interface VehicleRequestInput {
  /** false (or missing): for the signed-in account itself. */
  forOther?: boolean;
  forOtherName?: string;
  forOtherPhone?: string;
  purpose: VehiclePurpose;
  /** Guests only; deliveries use the sender and receiver fields. */
  customerName?: string;
  customerPhone?: string;
  passengerCount?: number | null;
  goodsDescription?: string;
  goodsQuantity?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  pickup: string;
  pickupLocation?: VehicleLocation | null;
  destination: string;
  departAt: string;
  roundTrip: boolean;
  returnAt?: string | null;
  /** HR only; ignored when the requester sends it. */
  expectedEndAt?: string;
  note?: string;
}

/** What HR may change: the trip details plus the car. */
export interface VehicleArrangeInput extends Partial<VehicleRequestInput> {
  vehicleType?: VehicleType;
  driverName?: string;
  driverPlate?: string;
  driverPhone?: string;
  estimatedCost?: number | null;
  /** Required when the time or route differs from the request; sent to the requester. */
  changeReason?: string;
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
