export type UserOtpPurpose = "register" | "reset";
export interface UserAuthChallenge {
  email: string;
  purpose: UserOtpPurpose;
  requestId: string;
  otpHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attempts: number;
  resendCount: number;
  name?: string;
  phone?: string;
  passwordHash?: string;
  accountId?: string;
  authVersion?: number;
}
export interface UserRegistrationInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}
