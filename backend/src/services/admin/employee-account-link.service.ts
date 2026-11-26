import type { AccountActorRef } from "../../interfaces/account.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { vehicleAccountClosedService } from "../vehicle/vehicle-account-closed";

// An employee record and a login account are separate; they are matched by company email.
// When an employee leaves or is removed, the matching login must stop working.
export type LinkedAccountChange =
  | { action: "none" }
  | { action: "locked" | "trashed" | "admin-skipped"; accountId: string; name: string; email: string };

async function findLinked(email: string) {
  return email.trim() ? adminAccountRepository.findByEmail(email) : null;
}
const describe = (account: { _id: unknown; name: string; email: string }) => ({ accountId: String(account._id), name: account.name, email: account.email });

export const employeeAccountLinkService = {
  // Employee set to "inactive" (left) or moved to the trash (deleted): lock the login and end its sessions.
  async lockForEmployee(email: string, reason: "employee-left" | "employee-deleted"): Promise<LinkedAccountChange> {
    const account = await findLinked(email);
    if (!account) return { action: "none" };
    // Never lock an Admin gốc automatically: a mistaken HR edit must not lock out the administrator.
    if (account.role === "admin") return { action: "admin-skipped", ...describe(account) };
    const locked = await adminAccountRepository.lockLinked(String(account._id), reason);
    if (!locked) return { action: "none" };
    // Their trips that have not happened yet are cancelled and HR is told.
    await vehicleAccountClosedService.cancelOpenTrips(String(locked._id), "locked");
    return { action: "locked", ...describe(locked) };
  },

  // Employee permanently deleted: move the login to the account trash (deleted for good only from there).
  async trashForEmployee(email: string, by?: AccountActorRef): Promise<LinkedAccountChange> {
    const account = await findLinked(email);
    if (!account) return { action: "none" };
    if (account.role === "admin") return { action: "admin-skipped", ...describe(account) };
    const trashed = await adminAccountRepository.trashLinked(String(account._id), by);
    if (!trashed) return { action: "none" };
    await vehicleAccountClosedService.cancelOpenTrips(String(trashed._id), "deleted", by);
    return { action: "trashed", ...describe(trashed) };
  },
};
