import { createHmac, randomInt, timingSafeEqual } from "crypto";

import { AppError } from "../errors/AppError";

export type OtpPurpose = "meeting-create" | "meeting-cancel";

function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) throw new AppError(500, "Máy chủ chưa cấu hình bảo mật OTP.");
  return secret;
}

export function createOtpCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export function hashOtp(purpose: OtpPurpose, key: string, code: string): string {
  return createHmac("sha256", getOtpSecret())
    .update(`${purpose}:${key}:${code}`)
    .digest("hex");
}

export function isOtpMatch(expectedHash: string, submittedHash: string): boolean {
  if (
    expectedHash.length !== submittedHash.length ||
    expectedHash.length !== 64 ||
    !/^[\da-f]+$/i.test(expectedHash) ||
    !/^[\da-f]+$/i.test(submittedHash)
  ) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(submittedHash, "hex"));
}
