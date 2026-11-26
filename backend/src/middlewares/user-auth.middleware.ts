import type { NextFunction, Request, Response } from "express";

import { USER_ACCESS_COOKIE } from "../controllers/user/auth.controller";
import { userAuthService } from "../services/user/auth.service";
import { AppError } from "../utils/errors/AppError";

/**
 * User-portal sessions (cookie "asia_user_token"). Admin-portal cookies are never
 * accepted here: the two portals keep separate sessions.
 */
async function resolveUser(request: Request): Promise<boolean> {
  const token = request.cookies?.[USER_ACCESS_COOKIE];
  if (typeof token !== "string" || !token) return false;
  try {
    const result = await userAuthService.authenticate(token);
    request.user = result.user;
    request.userSession = { id: result.sessionId, accountRole: result.accountRole, persistent: result.persistent, expiresAt: result.expiresAt };
    return true;
  } catch (error) {
    // An invalid or expired token is just "not signed in"; database errors still fail.
    if (error instanceof AppError && error.statusCode === 401) return false;
    throw error;
  }
}

/** Lets guests through; signed-in users get request.user. */
export async function attachUser(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try { await resolveUser(request); next(); } catch (error) { next(error); }
}

/** Only signed-in users. The site hides these pages from guests, and the API enforces it. */
export async function requireUserAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (await resolveUser(request)) { next(); return; }
    response.setHeader("Cache-Control", "no-store");
    response.status(401).json({ success: false, message: "Bạn cần đăng nhập để xem nội dung này." });
  } catch (error) { next(error); }
}
