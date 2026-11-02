export interface PasswordResetOtp {
  /** Internal generation ID. Optional only for pre-existing OTP records. */
  requestId?: string;
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PasswordResetOtpSnapshot = Pick<PasswordResetOtp, "email" | "requestId" | "otpHash">;

export interface StartPasswordResetInput {
  email: string;
}

export interface VerifyPasswordResetOtpInput {
  email: string;
  code: string;
}

export interface ResetPasswordWithOtpInput extends VerifyPasswordResetOtpInput {
  password: string;
}
