import type { PasswordResetOtp } from "../../interfaces/password-reset-otp.interface";
import PasswordResetOtpModel from "../../models/password-reset-otp.model";

export const passwordResetOtpRepository = {
  findByEmail(email: string) {
    return PasswordResetOtpModel.findOne({ email: email.toLowerCase() }).select("+otpHash");
  },

  upsert(data: Omit<PasswordResetOtp, "createdAt" | "updatedAt">) {
    return PasswordResetOtpModel.findOneAndUpdate(
      { email: data.email.toLowerCase() },
      { $set: data },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
  },

  deleteById(id: string) {
    return PasswordResetOtpModel.deleteOne({ _id: id });
  },
};
