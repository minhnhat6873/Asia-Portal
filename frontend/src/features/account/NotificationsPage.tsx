"use client";

import { Bell, CalendarCheck2, CalendarClock, CalendarX2, CarFront, CheckCheck, Trash2, CircleCheck, CircleX, Clock3, Newspaper, Package, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteAllNotifications, formatNotificationTime, getNotifications, markAllNotificationsRead, type NotificationType, type UserNotification } from "@/services/notification.service";
import { setUnreadNotificationCount, useUnreadNotificationCount } from "@/lib/notificationCount";
import { useOpenNotification } from "@/components/layout/NotificationBell";
import { showToast } from "@/features/admin/auth/notify";
import AccountShell, { Card } from "./AccountShell";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const PURPOSES = { "Đón/đưa khách": "guest", "Giao/nhận hàng": "delivery" } as const;
type Purpose = (typeof PURPOSES)[keyof typeof PURPOSES];

/**
 * Thông báo đặt xe có dạng "Mục đích · Tên · HH:mm dd/MM/yyyy · Điểm đón → Điểm đến"
 * (backend vehicle-notifier summary). Tách ra để hiện dạng thẻ; dạng khác (có thay đổi của HR,
 * lý do hủy…) trả null và hiện nguyên văn.
 */
function parseVehicleMessage(message: string) {
  const parts = message.split(" · ");
  const purposeIndex = parts.findIndex(part => part in PURPOSES);
  const purpose = PURPOSES[parts[purposeIndex] as keyof typeof PURPOSES];
  if (!purpose) return null;
  // Đặt giúp thêm một phần "đặt giúp X" trước tên khách, nên tìm vị trí phần giờ thay vì đếm cứng.
  const timeIndex = parts.findIndex((part, index) => index > purposeIndex + 1 && /^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/.test(part));
  if (timeIndex < 0) return null;
  const route = parts.slice(timeIndex + 1).join(" · ");
  const arrow = route.indexOf(" → ");
  if (arrow < 0) return null;
  return { purpose, name: parts.slice(purposeIndex + 1, timeIndex).join(" · "), time: parts[timeIndex], from: route.slice(0, arrow), to: route.slice(arrow + 3), context: parts.slice(0, purposeIndex).join(" · ") };
}

/** Icon và màu ô icon theo loại thông báo (xe giao hàng dùng icon thùng hàng). */
function iconFor(type: NotificationType, purpose?: Purpose): { Icon: typeof Bell; tone: string } {
  if (type === "vehicle-arrived" || type === "vehicle-completed") return { Icon: CircleCheck, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100" };
  if (type === "vehicle-cancelled" || type === "vehicle-request-cancelled") return { Icon: CircleX, tone: "bg-rose-50 text-rose-500 ring-rose-100" };
  if (type === "vehicle-request-updated") return { Icon: Pencil, tone: "bg-sky-50 text-sky-600 ring-sky-100" };
  if (type === "meeting-cancelled") return { Icon: CalendarX2, tone: "bg-rose-50 text-rose-500 ring-rose-100" };
  if (type === "meeting-updated") return { Icon: CalendarClock, tone: "bg-amber-50 text-amber-600 ring-amber-100" };
  if (type === "vehicle-overdue" || type === "vehicle-reminder") return { Icon: Clock3, tone: "bg-amber-50 text-amber-600 ring-amber-100" };
  if (type.startsWith("vehicle-")) return purpose === "delivery" ? { Icon: Package, tone: "bg-amber-50 text-amber-600 ring-amber-100" } : { Icon: CarFront, tone: "bg-blue-50 text-blue-600 ring-blue-100" };
  if (type === "meeting-booked") return { Icon: CalendarCheck2, tone: "bg-violet-50 text-violet-600 ring-violet-100" };
  if (type === "meeting-reminder") return { Icon: CalendarClock, tone: "bg-violet-50 text-violet-600 ring-violet-100" };
  if (type === "news") return { Icon: Newspaper, tone: "bg-sky-50 text-sky-600 ring-sky-100" };
  return { Icon: Bell, tone: "bg-slate-100 text-slate-500 ring-slate-200" };
}

function NotificationItem({ item, onOpen }: { item: UserNotification; onOpen: (item: UserNotification) => void }) {
  const trip = item.type.startsWith("vehicle-") ? parseVehicleMessage(item.message) : null;
  const { Icon, tone } = iconFor(item.type, trip?.purpose);
  const category = item.type.startsWith("vehicle-") ? "Đặt xe" : item.type.startsWith("meeting-") ? "Đặt phòng" : "Truyền thông";
  const accent = item.type.startsWith("vehicle-") ? "border-l-blue-500" : item.type.startsWith("meeting-") ? "border-l-violet-500" : "border-l-emerald-500";
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={`flex w-full items-start gap-4 border-l-[3px] px-4 py-5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600 sm:px-5 ${accent} ${item.read ? "bg-white" : "bg-slate-50/50"}`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}><Icon aria-hidden="true" size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <span className={`min-w-0 text-sm ${item.read ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
              {!item.read && <span className="sr-only">Chưa đọc: </span>}{item.title}
            </span>
            <span className={`shrink-0 text-xs ${item.read ? "text-slate-400" : "rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-600"}`}>{formatNotificationTime(item.createdAt)}</span>
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded px-2 py-1 text-[11px] font-semibold ${item.type.startsWith("vehicle-") ? "bg-blue-50 text-blue-700" : item.type.startsWith("meeting-") ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}>{category}</span><span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{item.read ? "Đã đọc" : "Chưa đọc"}</span></span>
          {trip ? (
            <span className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs shadow-sm sm:px-4">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${trip.purpose === "delivery" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{trip.purpose === "delivery" ? "Giao/nhận hàng" : "Đón khách"}</span>
                <span className="font-medium text-slate-800">{trip.name}</span>
                <span aria-hidden="true" className="text-slate-300">●</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700"><Clock3 aria-hidden="true" size={12} />{trip.time}</span>
              </span>
              <span className="mt-3 grid gap-3 border-t border-slate-100 pt-3 text-slate-700 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <span className="min-w-0 break-words"><span className="mb-1 block text-[11px] text-slate-500">Điểm đón</span>{trip.from}</span>
                <span aria-hidden="true" className="hidden self-center text-slate-400 sm:block">→</span>
                <span className="min-w-0 break-words"><span className="mb-1 block text-[11px] text-slate-500">Điểm đến</span>{trip.to}</span>
              </span>
              {trip.context && <span className="mt-3 block rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{trip.context}</span>}
            </span>
          ) : (
            <span className="mt-3 block whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] leading-5 text-slate-600">{item.message}</span>
          )}
          <span className="mt-3 block text-xs font-semibold text-emerald-700">{category === "Đặt xe" ? "Xem chuyến xe" : category === "Đặt phòng" ? "Xem lịch họp" : "Xem nội dung"} →</span>
        </span>
      </button>
    </li>
  );
}

export default function NotificationsPage() {
  const unread = useUnreadNotificationCount();
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const deleteAll = async () => {
    if (deleting) return;
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await deleteAllNotifications();
      setItems([]);
      setHasMore(false);
      setUnreadNotificationCount(0);
      showToast("Đã xóa tất cả thông báo", "", "success");
    } catch (reason) {
      showToast("Không thể xóa thông báo", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setDeleting(false); }
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
    <AccountShell
      title="Thông báo"
      badge={unread > 0 ? <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600">{unread > 99 ? "99+" : unread} mới</span> : undefined}
      description="Tin tức mới, lịch họp đã đặt và nhắc giờ. Hệ thống lưu trữ 60 ngày."
      action={
        <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void readAll()} disabled={unread === 0 || deleting} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCheck aria-hidden="true" size={16} />Đánh dấu đã đọc
        </button>
        <button type="button" onClick={() => setConfirmDelete(true)} disabled={!items?.length || loadingMore || deleting} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 aria-hidden="true" size={16} />{deleting ? "Đang xóa…" : "Xóa tất cả"}
        </button>
        </div>
      }
    >
      <ConfirmDialog open={confirmDelete} title="Xóa tất cả thông báo?" description="Tất cả thông báo của bạn sẽ bị xóa và không thể khôi phục." cancelLabel="Hủy" confirmLabel="Xóa tất cả" onCancel={() => setConfirmDelete(false)} onConfirm={() => void deleteAll()} />
      {error ? (
        <Card><p role="alert" className="text-center text-sm text-rose-600">{error}</p></Card>
      ) : items === null ? (
        <Card><p role="status" className="text-center text-sm text-slate-500">Đang tải…</p></Card>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span>Gần đây</span><span>Thời gian</span>
          </div>
          {items.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">Bạn chưa có thông báo nào.</p>
          ) : (
            <ul className="space-y-3 bg-slate-50/60 p-3 sm:p-4">{items.map((item) => <NotificationItem key={item.id} item={item} onOpen={open} />)}</ul>
          )}
          {items.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-center">
              {hasMore ? (
                <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  {loadingMore ? "Đang tải…" : "Xem thêm"}
                </button>
              ) : <p className="text-sm text-slate-400">Bạn đã xem hết thông báo.</p>}
            </div>
          )}
        </div>
      )}
    </AccountShell>
  );
}
