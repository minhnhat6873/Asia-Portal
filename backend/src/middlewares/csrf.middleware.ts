import type { NextFunction, Request, Response } from "express";
import { isAllowedCorsOrigin } from "../config/security.config";

// A cross-origin HTML form cannot set this header. Cross-origin JavaScript
// needs a successful CORS preflight; only explicitly trusted origins pass it.
export function requireCsrfProtection(request: Request, response: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) { next(); return; }
  const origin = request.get("Origin");
  const referer = request.get("Referer");
  let sourceAllowed = true;
  if (origin !== undefined) sourceAllowed = origin !== "null" && isAllowedCorsOrigin(origin);
  else if (referer) {
    try { sourceAllowed = isAllowedCorsOrigin(new URL(referer).origin); }
    catch { sourceAllowed = false; }
  }
  if (!sourceAllowed || request.get("X-Requested-With") !== "AsiaPortal") {
    response.status(403).json({ success: false, message: "Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại." });
    return;
  }
  next();
}
