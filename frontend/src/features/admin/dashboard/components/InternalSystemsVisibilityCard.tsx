"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, LoaderCircle, RotateCcw } from "lucide-react";
import { getAdminSiteSettings, updateAdminSiteSettings } from "@/services/site-settings.service";

export function InternalSystemsVisibilityCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void getAdminSiteSettings(controller.signal).then((settings) => {
      if (!controller.signal.aborted) { setEnabled(settings.internalSystemsEnabled === true); setError(""); }
    }).catch(() => { if (!controller.signal.aborted) setError("Không thể tải cài đặt. Vui lòng thử lại."); });
    return () => controller.abort();
  }, [retry]);

  const toggle = async () => {
    if (enabled === null || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const settings = await updateAdminSiteSettings(!enabled);
      setEnabled(settings.internalSystemsEnabled === true);
      setMessage(settings.internalSystemsEnabled ? "Đã bật menu WANA trên trang public." : "Đã ẩn menu WANA trên trang public.");
      window.dispatchEvent(new Event("asia-site-settings-updated"));
    } catch {
      setError("Chưa xác nhận được thay đổi. Vui lòng thử lại hoặc tải lại trang để kiểm tra.");
    } finally { busy.current = false; setSaving(false); }
  };

  return <section aria-labelledby="wana-visibility-title" className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:rounded-3xl sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Globe size={24} /></span>
        <div className="min-w-0">
          <h3 id="wana-visibility-title" className="text-base font-bold text-slate-900">Hệ thống nội bộ WANA</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">Hiển thị menu CRM, Wiki, LMS và ERP trên thanh điều hướng của website.</p>
          <p className="mt-1 text-xs text-slate-400">Cài đặt áp dụng cho tất cả người dùng, trên máy tính và điện thoại.</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <span className="text-sm font-semibold text-slate-600">{saving ? "Đang lưu…" : enabled === null ? "Chưa tải cài đặt" : enabled ? "Đang hiển thị" : "Đang ẩn"}</span>
        <button type="button" role="switch" aria-label="Hiển thị Hệ thống nội bộ WANA" aria-checked={enabled === true} disabled={enabled === null || saving} onClick={() => void toggle()} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "bg-emerald-600" : "bg-slate-300"}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}>{saving ? <LoaderCircle size={14} className="animate-spin text-emerald-700" /> : null}</span>
        </button>
      </div>
    </div>
    {error ? <div className="mt-3 flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-rose-600">{error}</p>{enabled === null ? <button type="button" onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><RotateCcw size={14} />Thử lại</button> : null}</div> : null}
    {message ? <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p> : null}
  </section>;
}
