"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { apiGet, apiPost } from "@/services/api";
import { safeSitePath } from "@/lib/safeRedirect";
import { NotificationRow } from "@/components/layout/NotificationBell";
import type { NotificationPage, UserNotification } from "@/services/notification.service";
import NotificationAlerts from "@/components/layout/NotificationAlerts";

const loadAdminNotifications = () => apiGet<NotificationPage>("/admin/notifications");

/** Bell in the admin portal (e.g. HR: new vehicle requests, trips waiting to be closed). */
export default function AdminNotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const [error, setError] = useState("");

  const refreshCount = useCallback(() => {
    apiGet<{ unread: number }>("/admin/notifications/unread-count").then((value) => setUnread(value.unread)).catch(() => undefined);
  }, []);
  useEffect(() => {
    refreshCount();
    const tick = () => { if (document.visibilityState === "visible") refreshCount(); };
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, [refreshCount]);

  const load = () => {
    setError("");
    apiGet<NotificationPage>("/admin/notifications")
      .then((page) => { setItems(page.items.slice(0, 10)); setUnread(page.unread); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được thông báo."));
  };
  const open = (item: UserNotification) => {
    if (!item.read) void apiPost(`/admin/notifications/${encodeURIComponent(item.id)}/read`, {}).finally(refreshCount);
    setIsOpen(false);
    router.push(safeSitePath(item.link, "/admin"));
  };
  const readAll = async () => {
    try {
      await apiPost("/admin/notifications/read-all", {});
      setItems((current) => current?.map((item) => ({ ...item, read: true })) ?? null);
      setUnread(0);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể cập nhật thông báo."); }
  };

  return (
    <>
    {/* Chime (and desktop pop-up when the tab is hidden) for new admin notifications. */}
    <NotificationAlerts scope="admin" streamUrl="/backend-api/admin/notifications/stream" load={loadAdminNotifications} fallbackLink="/admin" onFresh={refreshCount} />
    <DialogTrigger isOpen={isOpen} onOpenChange={(next) => { setIsOpen(next); if (next) load(); }}>
      <Button aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"} className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 outline-none hover:bg-slate-100 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500">
        <Bell aria-hidden="true" size={21} />
        {unread > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unread > 99 ? "99+" : unread}</span>}
      </Button>
      <Popover placement="bottom end" offset={8} className="z-[80] w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white shadow-xl outline-none">
        <Dialog aria-label="Thông báo" className="outline-none">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-slate-900">Thông báo</h2>
            {unread > 0 && <button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><CheckCheck aria-hidden="true" size={15} />Đánh dấu đã đọc hết</button>}
          </div>
          <div className="max-h-[440px] overflow-y-auto p-2">
            {error ? <p role="alert" className="px-3 py-6 text-center text-sm text-rose-600">{error}</p>
              : items === null ? <p role="status" className="px-3 py-6 text-center text-sm text-slate-500">Đang tải…</p>
                : items.length === 0 ? <p className="px-3 py-8 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>
                  : items.map((item) => <NotificationRow key={item.id} item={item} onOpen={open} />)}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
    </>
  );
}
