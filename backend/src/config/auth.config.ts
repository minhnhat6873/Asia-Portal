import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "asia_admin_token";
export const AUTH_TOKEN_LIFETIME_MS = 8 * 60 * 60 * 1000;

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_TOKEN_LIFETIME_MS,
    path: "/",
  };
}