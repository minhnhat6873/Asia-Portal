"use client";

import { CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getNotifications, markAllNotificationsRead, type UserNotification } from "@/services/notification.service";
import { setUnreadNotificationCount, useUnreadNotificationCount } from "@/lib/notificationCount";
import { NotificationRow, useOpenNotification } from "@/components/layout/NotificationBell";
import { showToast } from "@/features/admin/auth/notify";
import AccountShell, { Card } from "./AccountShell";

export default function NotificationsPage() {
  const unread = useUnreadNotificationCount();
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const open = useOpenNotification();

  useEffect(() => {
    const controller = new AbortController();
    getNotifications(undefined, controller.signal)
      .then((page) => { setItems(page.items); setHasMore(page.hasMore); setUnreadNotificationCount(page.unread); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được thông báo."); });
    return () => controller.abort();
  }, []);

  const loadMore = async () => {
    const last = items?.at(-1);
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getNotifications(last.createdAt);
      setItems((current) => [...(current ?? []), ...page.items.filter((item) => !current?.some((existing) => existing.id === item.id))]);
      setHasMore(page.hasMore);
    } catch (reason) {
      showToast("Không tải thêm được thông báo", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setLoadingMore(false); }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current?.map((item) => ({ ...item, read: true })) ?? null);
      setUnreadNotificationCount(0);
    } catch (reason) {
      showToast("Không thể cập nhật thông báo", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    }
  };

  return (
    <AccountShell title="Thông báo" description="Tin tức mới, lịch họp đã đặt và nhắc giờ họp. Thông báo được giữ trong 60 ngày.">
      <Card className="!p-3 sm:!p-4">
        <div className="flex items-center justify-between gap-3 px-2 pb-3">
          <p className="text-sm text-slate-500">{unread ? `${unread} thông báo chưa đọc` : "Bạn đã đọc hết thông báo."}</p>
          {unread > 0 && (
            <button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              <CheckCheck aria-hidden="true" size={16} />Đánh dấu đã đọc hết
            </button>
          )}
        </div>
        {error ? (
          <p role="alert" className="px-3 py-6 text-center text-sm text-rose-600">{error}</p>
        ) : items === null ? (
          <p role="status" className="px-3 py-6 text-center text-sm text-slate-500">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500">Bạn chưa có thông báo nào.</p>
        ) : (
          <div className="space-y-1">{items.map((item) => <NotificationRow key={item.id} item={item} onOpen={open} />)}</div>
        )}
        {hasMore && (
          <div className="pt-3 text-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {loadingMore ? "Đang tải…" : "Xem thêm"}
            </button>
          </div>
        )}
      </Card>
    </AccountShell>
  );
}
