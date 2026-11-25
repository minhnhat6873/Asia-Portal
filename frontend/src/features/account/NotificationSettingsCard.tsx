"use client";

import { BellRing, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import {
  desktopNotificationStatus,
  playNotificationSound,
  requestDesktopNotifications,
  subscribeDesktopNotificationStatus,
  unlockNotificationSound,
  type DesktopNotificationStatus,
} from "@/lib/notificationAlerts";

const STATUS_TEXT: Record<DesktopNotificationStatus, string> = {
  granted: "Đã bật. Khi bạn đang ở tab hoặc ứng dụng khác, thông báo mới sẽ hiện ở góc màn hình.",
  default: "Chưa bật. Bật để thấy thông báo ở góc màn hình khi bạn không mở tab Asia Portal.",
  denied: "Thông báo ở góc màn hình đang bị chặn. Nếu bạn dùng cửa sổ ẩn danh (Incognito), trình duyệt luôn chặn, hãy mở cửa sổ thường. Nếu không, bấm biểu tượng bên trái địa chỉ trang → Thông báo → Cho phép, rồi tải lại trang. Âm thanh trong trang vẫn hoạt động.",
  insecure: "Trang đang chạy http nên trình duyệt không cho hiện thông báo ở góc màn hình (cần HTTPS). Âm thanh trong trang vẫn hoạt động.",
  unsupported: "Trình duyệt này không hỗ trợ thông báo ở góc màn hình. Âm thanh trong trang vẫn hoạt động.",
};

/** Sound test and desktop pop-up permission (asked only when the person presses the button). */
export default function NotificationSettingsCard({ className = "" }: { className?: string }) {
  const status = useSyncExternalStore(subscribeDesktopNotificationStatus, desktopNotificationStatus, () => "unsupported" as const);
  const [asking, setAsking] = useState(false);
  // Chrome may hide the permission question (after it was dismissed a few times) and only
  // show "Notifications blocked" in the address bar; the status then stays "default".
  const [quietlyBlocked, setQuietlyBlocked] = useState(false);

  const testSound = () => { unlockNotificationSound(); playNotificationSound(); };
  const enable = async () => {
    setAsking(true);
    try { setQuietlyBlocked((await requestDesktopNotifications()) === "default"); } finally { setAsking(false); }
  };

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><BellRing aria-hidden="true" size={20} /></span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Âm thanh và thông báo trên máy</h2>
          <p className="text-xs text-slate-500">Có thông báo mới, trang phát tiếng “ting”, kể cả khi bạn đang ở tab khác (miễn là trang còn mở).</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={testSound} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Volume2 aria-hidden="true" size={17} />Nghe thử
        </button>
        {status === "default" && (
          <button type="button" onClick={() => void enable()} disabled={asking} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
            <BellRing aria-hidden="true" size={17} />{asking ? "Đang chờ bạn chọn…" : "Bật thông báo trên máy"}
          </button>
        )}
      </div>
      <p role="status" className={`mt-3 text-sm ${status === "granted" ? "text-emerald-700" : status === "denied" ? "text-rose-600" : "text-slate-600"}`}>{STATUS_TEXT[status]}</p>
      {quietlyBlocked && status === "default" && (
        <p role="alert" className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Trình duyệt đã ẩn hộp hỏi quyền. Hãy bấm vào biểu tượng chuông có gạch chéo (“Notifications blocked”) ở đầu thanh địa chỉ → chọn <strong>Cho phép</strong> (Allow), rồi tải lại trang.
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">Trình duyệt chỉ phát âm thanh sau khi bạn đã bấm vào trang ít nhất một lần. Tắt hẳn trình duyệt thì sẽ không có thông báo.</p>
    </div>
  );
}
