export interface PendingRegistration {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StartRegistrationInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface VerifyRegistrationOtpInput {
  email: string;
  code: string;
}