import type { NextFunction, Request, Response } from "express";

import { notificationService } from "../../services/user/notification.service";
import { AppError } from "../../utils/errors/AppError";

// Every route here runs after requireUserAuth.

export async function listNotifications(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const before = request.query.before ? new Date(String(request.query.before)) : undefined;
    response.json({ success: true, data: await notificationService.list(request.user!.id, before) });
  } catch (error) { next(error); }
}

export async function unreadNotifications(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: { unread: await notificationService.unreadCount(request.user!.id) } });
  } catch (error) { next(error); }
}

export async function markNotificationRead(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await notificationService.markRead(request.user!.id, request.params.id))) throw new AppError(404, "Không tìm thấy thông báo.");
    response.json({ success: true });
  } catch (error) { next(error); }
}

export async function markAllNotificationsRead(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.markAllRead(request.user!.id);
    response.json({ success: true });
  } catch (error) { next(error); }
}

export async function deleteNotification(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await notificationService.deleteOne(request.user!.id, request.params.id))) throw new AppError(404, "Không tìm thấy thông báo.");
    response.json({ success: true });
  } catch (error) { next(error); }
}

export async function deleteAllNotifications(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.deleteAll(request.user!.id);
    response.json({ success: true });
  } catch (error) { next(error); }
}
