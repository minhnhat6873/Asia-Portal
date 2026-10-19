export interface PasswordChangeOtp {
  accountId: string;
  requestId: string;
  email: string;
  otpHash: string;
  currentPasswordHash: string;
  newPasswordHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
}

export interface RequestPasswordChangeInput { currentPassword: string; newPassword: string; }
export interface ConfirmPasswordChangeInput { requestId: string; code: string; }
