import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "asia_admin_token";
export const AUTH_REFRESH_COOKIE_NAME = "asia_admin_refresh_token";
export const AUTH_TOKEN_LIFETIME_MS = 10 * 60 * 60 * 1000;
export const AUTH_REMEMBER_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

function getBaseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: parseBoolean(process.env.AUTH_COOKIE_SECURE, false),
    sameSite: "lax",
    path: "/",
  };
}

// Khi không chọn "Ghi nhớ", cookie sẽ hết hiệu lực khi đóng trình duyệt.
// JWT bên trong vẫn luôn hết hạn sau 10 giờ.
export function getAuthCookieOptions(persistent = false): CookieOptions {
  return persistent
    ? { ...getBaseCookieOptions(), maxAge: AUTH_TOKEN_LIFETIME_MS }
    : getBaseCookieOptions();
}

export function getRememberCookieOptions(): CookieOptions {
  return { ...getBaseCookieOptions(), maxAge: AUTH_REMEMBER_LIFETIME_MS };
}