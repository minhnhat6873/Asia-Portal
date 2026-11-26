import type { StoredVehicleBooking, VehiclePerson } from "../../interfaces/vehicle-booking.interface";
import { vehicleBookingRepository } from "../../repositories/vehicle-booking.repository";
import { vehicleNotifier } from "./vehicle-notifier";

/** Shown as "who cancelled" when the account was locked automatically (employee left). */
const SYSTEM: VehiclePerson = { accountId: "", name: "Hệ thống", email: "" };
const REASONS = {
  deleted: "Tài khoản người đặt đã bị xóa.",
  locked: "Tài khoản người đặt đã bị khóa.",
} as const;

/**
 * The requester's account was deleted or locked (by hand or because the employee left):
 * trips that have not happened yet ("pending", "arranged") are cancelled and HR is told
 * once per trip. Trips already driven or closed stay, so the cost reports remain right.
 * A lock caused by wrong passwords is temporary and does not come here.
 * Never throws: the account change has already been saved.
 */
export const vehicleAccountClosedService = {
  async cancelOpenTrips(accountId: string, why: keyof typeof REASONS, by?: VehiclePerson | null): Promise<number> {
    try {
      const trips = await vehicleBookingRepository.findOpenByRequester(accountId) as StoredVehicleBooking[];
      let cancelled = 0;
      for (const trip of trips) {
        const saved = await vehicleBookingRepository.updateIfStatus(String(trip._id), [trip.status], {
          $set: { status: "cancelled", cancel: { by: by ?? SYSTEM, byRequester: false, reason: REASONS[why], at: new Date() } },
        }) as StoredVehicleBooking | null;
        if (!saved) continue; // Changed in the meantime (e.g. HR just closed it).
        cancelled += 1;
        await vehicleNotifier.toHr(saved, "vehicle-requester-removed");
      }
      return cancelled;
    } catch (error) {
      console.error("Không tự hủy được chuyến xe của tài khoản đã bị khóa/xóa.", error);
      return 0;
    }
  },
};
