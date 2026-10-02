import { apiPost } from "@/services/api";

interface OtpResponse {
  email: string;
  expiresInSeconds: number;
}

export function requestPasswordResetOtp(email: string): Promise<OtpResponse> {
  return apiPost<OtpResponse>("/admin/auth/forgot-password", { email });
}

export function verifyPasswordResetOtp(email: string, code: string): Promise<void> {
  return apiPost<void>("/admin/auth/forgot-password/verify-otp", { email, code });
}

export function resetPasswordWithOtp(
  email: string,
  code: string,
  password: string,
  confirmPassword: string,
): Promise<void> {
  return apiPost<void>("/admin/auth/forgot-password/reset", {
    email,
    code,
    password,
    confirmPassword,
  });
}

export function resendPasswordResetOtp(email: string): Promise<OtpResponse> {
  return apiPost<OtpResponse>("/admin/auth/forgot-password/resend-otp", { email });
}
