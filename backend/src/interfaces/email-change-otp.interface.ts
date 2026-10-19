export interface EmailChangeOtp {
  accountId: string;
  requestId: string;
  currentEmail: string;
  newEmail: string;
  currentPasswordHash: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
}
export interface RequestEmailChangeInput { newEmail: string; }
export interface ConfirmEmailChangeInput { requestId: string; code: string; }
