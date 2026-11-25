"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarCheck2, CalendarClock, CalendarX2, CarFront, CheckCheck, Newspaper } from "lucide-react";
import { useState } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import {
  formatNotificationTime,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  safeNotificationLink,
  type NotificationType,
  type UserNotification,
} from "@/services/notification.service";
import { setUnreadNotificationCount, useUnreadNotificationCount } from "@/lib/notificationCount";

export const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  news: Newspaper,
  "meeting-booked": CalendarCheck2,
  "meeting-reminder": CalendarClock,
  "meeting-updated": CalendarClock,
  "meeting-cancelled": CalendarX2,
  "vehicle-arranged": CarFront, "vehicle-updated": CarFront, "vehicle-completed": CarFront, "vehicle-cancelled": CarFront,
  "vehicle-reminder": CarFront, "vehicle-new": CarFront, "vehicle-arrived": CarFront, "vehicle-overdue": CarFront,
  "vehicle-pending-overdue": CarFront,
  "vehicle-request-updated": CarFront, "vehicle-request-cancelled": CarFront,
};

export function NotificationRow({ item, onOpen }: { item: UserNotification; onOpen: (item: UserNotification) => void }) {
  const Icon = NOTIFICATION_ICONS[item.type] ?? Bell;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600 ${item.read ? "" : "bg-emerald-50/60"}`}
    >
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.read ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
        <Icon aria-hidden="true" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${item.read ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>{item.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-slate-600">{item.message}</span>
        <span className="mt-1 block text-xs text-slate-400">{formatNotificationTime(item.createdAt)}</span>
      </span>
      {!item.read && <span aria-label="Chưa đọc" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}
    </button>
  );
}

/** Opens a notification: marks it read, then follows its link on this site. */
export function useOpenNotification(onDone?: () => void) {
  const router = useRouter();
  return (item: UserNotification) => {
    if (!item.read) {
      void markNotificationRead(item.id).finally(() => window.dispatchEvent(new Event("asia-notifications-changed")));
    }
    onDone?.();
    router.push(safeNotificationLink(item.link));
  };
}

export default function NotificationBell() {
  const unread = useUnreadNotificationCount();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const [error, setError] = useState("");
  const open = useOpenNotification(() => setIsOpen(false));

  const load = () => {
    setError("");
    getNotifications()
      .then((page) => { setItems(page.items.slice(0, 8)); setUnreadNotificationCount(page.unread); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được thông báo."));
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current?.map((item) => ({ ...item, read: true })) ?? null);
      setUnreadNotificationCount(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật thông báo.");
    }
  };

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(next) => { setIsOpen(next); if (next) load(); }}>
      <Button
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 outline-none transition-colors hover:bg-slate-100 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <Bell aria-hidden="true" size={22} />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      <Popover placement="bottom end" offset={10} className="z-[80] w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white shadow-xl outline-none">
        <Dialog aria-label="Thông báo" className="outline-none">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-slate-900">Thông báo</h2>
            {unread > 0 && (
              <button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                <CheckCheck aria-hidden="true" size={15} />Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {error ? (
              <p role="alert" className="px-3 py-6 text-center text-sm text-rose-600">{error}</p>
            ) : items === null ? (
              <p role="status" className="px-3 py-6 text-center text-sm text-slate-500">Đang tải…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">Bạn chưa có thông báo nào.</p>
            ) : (
              items.map((item, index) => <div key={item.id} className={index >= 3 ? "hidden sm:block" : undefined}><NotificationRow item={item} onOpen={open} /></div>)
            )}
          </div>
          <div className="border-t border-slate-100 p-2">
            <Link href="/user/account/notifications" onClick={() => setIsOpen(false)} className="block rounded-xl px-3 py-2 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              Xem tất cả thông báo
            </Link>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
