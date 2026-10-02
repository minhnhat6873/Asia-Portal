export interface PasswordResetOtp {
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

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
