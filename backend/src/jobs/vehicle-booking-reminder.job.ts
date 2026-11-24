import mongoose from "mongoose";

import type { StoredVehicleBooking } from "../interfaces/vehicle-booking.interface";
import { vehicleBookingRepository } from "../repositories/vehicle-booking.repository";
import { vehicleNotifier } from "../services/vehicle/vehicle-notifier";

/** Requester: website + email this long before departure. */
export const VEHICLE_DEPART_REMINDER_MS = 15 * 60_000;
/** HR: email when a trip is still not closed this long after the website reminder. */
export const VEHICLE_HR_EMAIL_AFTER_MS = 30 * 60_000;
const POLL_INTERVAL_MS = 60_000;

let interval: NodeJS.Timeout | undefined;
let running = false;

export async function runVehicleReminders(now = new Date()): Promise<void> {
  // 1. Departure reminder to the requester.
  for (const trip of await vehicleBookingRepository.findDepartReminders(now, VEHICLE_DEPART_REMINDER_MS) as StoredVehicleBooking[]) {
    if (!(await vehicleBookingRepository.claimFlag(trip._id, "departReminderSentAt"))) continue;
    await vehicleNotifier.toRequester(trip, "vehicle-reminder");
    await vehicleNotifier.emailRequesterReminder(trip);
  }
  // 2. HR: the requester reported "đã đi xong" or the expected end passed, and nobody closed it.
  for (const trip of await vehicleBookingRepository.findOverdueForHr(now) as StoredVehicleBooking[]) {
    if (!(await vehicleBookingRepository.claimFlag(trip._id, "hrOverdueNotifiedAt"))) continue;
    await vehicleNotifier.toHr(trip, "vehicle-overdue");
  }
  // 3. HR: still not closed 30 minutes later -> email.
  for (const trip of await vehicleBookingRepository.findOverdueEmailDue(new Date(now.getTime() - VEHICLE_HR_EMAIL_AFTER_MS)) as StoredVehicleBooking[]) {
    if (!(await vehicleBookingRepository.claimFlag(trip._id, "hrOverdueEmailedAt"))) continue;
    await vehicleNotifier.emailHrOverdue(trip);
  }
}

async function tick(): Promise<void> {
  if (running || mongoose.connection.readyState !== 1) return;
  running = true;
  try { await runVehicleReminders(); } catch (error) { console.error("Vehicle reminder job failed.", error); } finally { running = false; }
}

export function startVehicleBookingReminderJob(): void {
  if (interval) return;
  interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
  interval.unref();
  void tick();
}
