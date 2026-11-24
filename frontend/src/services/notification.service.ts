import { apiGet, apiPost } from "./api";
import { safeSitePath } from "@/lib/safeRedirect";

export type NotificationType = "news" | "meeting-booked" | "meeting-reminder"
  | "vehicle-arranged" | "vehicle-updated" | "vehicle-completed" | "vehicle-cancelled" | "vehicle-reminder"
  | "vehicle-new" | "vehicle-arrived" | "vehicle-overdue";

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Site-relative link, e.g. "/news/<id>". */
  link: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage { items: UserNotification[]; unread: number; hasMore: boolean }

export function getNotifications(before?: string, signal?: AbortSignal): Promise<NotificationPage> {
  return apiGet<NotificationPage>(`/user/notifications${before ? `?before=${encodeURIComponent(before)}` : ""}`, signal);
}

export async function getUnreadNotificationCount(signal?: AbortSignal): Promise<number> {
  return (await apiGet<{ unread: number }>("/user/notifications/unread-count", signal)).unread;
}

export function markNotificationRead(id: string): Promise<void> {
  return apiPost<void>(`/user/notifications/${encodeURIComponent(id)}/read`, {});
}

export function markAllNotificationsRead(): Promise<void> {
  return apiPost<void>("/user/notifications/read-all", {});
}

/** Only links inside this site are followed (never another website). */
export function safeNotificationLink(link: string): string {
  return safeSitePath(link, "/account/notifications");
}

export function formatNotificationTime(value: string, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(0, Math.round((now - time) / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(time).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
