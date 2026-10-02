import { apiPost } from "@/services/api";

export interface RegisterAccountPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

interface RegistrationOtpResponse {
  email: string;
  expiresInSeconds: number;
}

interface RegisteredAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "user" | "manager" | "admin";
  status: "pending" | "active" | "inactive";
}

export function startRegistration(payload: RegisterAccountPayload): Promise<RegistrationOtpResponse> {
  return apiPost<RegistrationOtpResponse>("/admin/auth/register", payload);
}

export function verifyRegistrationOtp(email: string, code: string): Promise<RegisteredAccount> {
  return apiPost<RegisteredAccount>("/admin/auth/register/verify-otp", { email, code });
}

export function resendRegistrationOtp(email: string): Promise<RegistrationOtpResponse> {
  return apiPost<RegistrationOtpResponse>("/admin/auth/register/resend-otp", { email });
}