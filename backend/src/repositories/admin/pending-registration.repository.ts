import type { PendingRegistration } from "../../interfaces/pending-registration.interface";
import PendingRegistrationModel from "../../models/pending-registration.model";

export const pendingRegistrationRepository = {
  findByEmail(email: string) {
    return PendingRegistrationModel.findOne({ email: email.toLowerCase() }).select("+passwordHash +otpHash");
  },

  upsert(data: Omit<PendingRegistration, "createdAt" | "updatedAt">) {
    return PendingRegistrationModel.findOneAndUpdate(
      { email: data.email.toLowerCase() },
      { $set: data },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
  },

  deleteById(id: string) {
    return PendingRegistrationModel.deleteOne({ _id: id });
  },
};