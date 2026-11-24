import type { NextFunction, Request, Response } from "express";

import { notificationService } from "../../services/user/notification.service";
import { AppError } from "../../utils/errors/AppError";

// Same notifications as the user portal, for the signed-in admin-portal account (e.g. HR).

export async function listAdminNotifications(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const before = request.query.before ? new Date(String(request.query.before)) : undefined;
    response.json({ success: true, data: await notificationService.list(request.admin!.id, before) });
  } catch (error) { next(error); }
}

export async function adminUnreadNotifications(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: { unread: await notificationService.unreadCount(request.admin!.id) } });
  } catch (error) { next(error); }
}

export async function markAdminNotificationRead(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await notificationService.markRead(request.admin!.id, request.params.id))) throw new AppError(404, "Không tìm thấy thông báo.");
    response.json({ success: true });
  } catch (error) { next(error); }
}

export async function markAllAdminNotificationsRead(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.markAllRead(request.admin!.id);
    response.json({ success: true });
  } catch (error) { next(error); }
}
