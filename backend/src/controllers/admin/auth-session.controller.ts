import type { NextFunction, Request, Response } from "express";
import type { SessionListQuery } from "../../interfaces/auth-session.interface";
import { adminSessionService } from "../../services/admin/auth-session.service";
import { AUTH_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME, getAuthCookieOptions } from "../../config/auth.config";

function respond(response: Response, data: { signedOut: boolean }) {
  if (data.signedOut) {
    const { httpOnly, secure, sameSite, path } = getAuthCookieOptions();
    for (const name of [AUTH_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME]) response.clearCookie(name, { httpOnly, secure, sameSite, path });
  }
  response.setHeader("Cache-Control", "no-store");
  response.json({ success: true, data });
}

export async function listSessions(request: Request<unknown, unknown, unknown, SessionListQuery>, response: Response, next: NextFunction) {
  try {
    const data = await adminSessionService.list(request.admin!, request.adminSessionId!, request.query);
    response.setHeader("Cache-Control", "no-store");
    response.json({ success: true, data });
  } catch (error) { next(error); }
}
export async function revokeSession(request: Request<{ id: string }, unknown, unknown, { accountId?: string }>, response: Response, next: NextFunction) {
  try { respond(response, await adminSessionService.revokeOne(request.admin!, request.adminSessionId!, request.params.id, request.query.accountId)); }
  catch (error) { next(error); }
}
export async function revokeSessions(request: Request<unknown, unknown, unknown, { accountId?: string; scope: "others" | "all" }>, response: Response, next: NextFunction) {
  try { respond(response, await adminSessionService.revokeMany(request.admin!, request.adminSessionId!, request.query.scope, request.query.accountId)); }
  catch (error) { next(error); }
}
