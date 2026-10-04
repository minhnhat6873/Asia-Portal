import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "asia_admin_token";
export const AUTH_REFRESH_COOKIE_NAME = "asia_admin_refresh_token";
export const AUTH_TOKEN_LIFETIME_MS = 10 * 60 * 60 * 1000;
export const AUTH_REMEMBER_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

function getBaseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };
}

// Khi không tick “Ghi nhớ”, cookie bị xóa khi người dùng đóng trình duyệt.
// JWT bên trong vẫn luôn hết hạn sau 10 giờ.
export function getAuthCookieOptions(persistent = false): CookieOptions {
  return persistent
    ? { ...getBaseCookieOptions(), maxAge: AUTH_TOKEN_LIFETIME_MS }
    : getBaseCookieOptions();
}

export function getRememberCookieOptions(): CookieOptions {
  return { ...getBaseCookieOptions(), maxAge: AUTH_REMEMBER_LIFETIME_MS };
}