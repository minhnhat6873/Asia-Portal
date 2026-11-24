import { model, models, Schema } from "mongoose";

import {
  VEHICLE_PURPOSES,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  type VehicleBooking,
} from "../interfaces/vehicle-booking.interface";

const person = new Schema({ accountId: String, name: String, email: String }, { _id: false });

const vehicleBookingSchema = new Schema<VehicleBooking>(
  {
    requester: {
      type: new Schema({ accountId: { type: String, required: true }, name: String, email: String, department: String }, { _id: false }),
      required: true,
    },
    purpose: { type: String, enum: VEHICLE_PURPOSES, required: true },
    customerName: { type: String, required: true, trim: true, maxlength: 310 },
    customerPhone: { type: String, trim: true, maxlength: 20, default: "" },
    passengerCount: { type: Number, min: 1, max: 50, default: null },
    goodsDescription: { type: String, trim: true, maxlength: 500, default: "" },
    senderName: { type: String, trim: true, maxlength: 150, default: "" },
    senderPhone: { type: String, trim: true, maxlength: 20, default: "" },
    receiverName: { type: String, trim: true, maxlength: 150, default: "" },
    receiverPhone: { type: String, trim: true, maxlength: 20, default: "" },
    pickup: { type: String, required: true, trim: true, maxlength: 300 },
    destination: { type: String, required: true, trim: true, maxlength: 300 },
    departAt: { type: Date, required: true },
    roundTrip: { type: Boolean, default: false },
    returnAt: { type: Date, default: null },
    expectedEndAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: VEHICLE_STATUSES, default: "pending", index: true },
    vehicleType: { type: String, enum: [...VEHICLE_TYPES, null], default: null },
    driverName: { type: String, trim: true, maxlength: 100, default: "" },
    driverPlate: { type: String, trim: true, maxlength: 20, default: "" },
    driverPhone: { type: String, trim: true, maxlength: 20, default: "" },
    estimatedCost: { type: Number, min: 0, default: null },
    actualCost: { type: Number, min: 0, default: null },
    receipts: {
      type: [new Schema({ url: String, publicId: String, uploadedBy: { type: String, enum: ["requester", "hr"] }, at: Date }, { _id: false })],
      default: [],
    },
    arrangedBy: { type: person, default: null },
    arrivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: person, default: null },
    cancel: {
      type: new Schema({ by: person, byRequester: Boolean, reason: String, at: Date }, { _id: false }),
      default: null,
    },
    departReminderSentAt: { type: Date, default: null },
    hrOverdueNotifiedAt: { type: Date, default: null },
    hrOverdueEmailedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "vehicle_bookings" },
);

vehicleBookingSchema.index({ "requester.accountId": 1, departAt: -1 });
vehicleBookingSchema.index({ departAt: -1 });
vehicleBookingSchema.index({ status: 1, expectedEndAt: 1 });

const VehicleBookingModel = models.VehicleBooking || model<VehicleBooking>("VehicleBooking", vehicleBookingSchema);

export default VehicleBookingModel;
