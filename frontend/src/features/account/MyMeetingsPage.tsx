"use client";

import Link from "next/link";
import { CalendarX2, Clock3, MapPin, Plus, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cancelMyBooking, getMyMeetingBookings, type MyMeetingBooking } from "@/services/meeting.service";
import { showToast } from "@/features/admin/auth/notify";
import AccountShell, { Card } from "./AccountShell";

const ROOMS: Record<string, string> = { "room-01": "Phòng 1 · Tầng 1", "room-02": "Phòng 2 · Tầng 1" };
const formatDate = (value: string) => value.split("-").reverse().join("/");

function MeetingRow({ booking, onCancel, busy }: { booking: MyMeetingBooking; onCancel?: (booking: MyMeetingBooking) => void; busy?: boolean }) {
  const [year, month, day] = booking.date.split("-");
  const upcoming = Boolean(onCancel);
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sm:flex-row">
      {/* Khối ngày bên trái */}
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:w-28 sm:flex-col sm:items-start sm:border-b-0 sm:border-r sm:py-4">
        <time dateTime={booking.date} title={formatDate(booking.date)} className="leading-tight">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Tháng {Number(month)}</span>
          <span className="block text-2xl font-extrabold text-slate-900">{day}</span>
          <span className="block text-xs text-slate-400">Năm {year}</span>
        </time>
        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${upcoming ? "text-emerald-700" : "text-slate-500"}`}><Clock3 aria-hidden="true" size={14} />{booking.start} – {booking.end}</span>
      </div>

      <div className="min-w-0 flex-1 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 truncate text-base font-bold text-slate-900" title={booking.title}>{booking.title}</p>
          {upcoming ? (
            <button type="button" disabled={busy} onClick={() => onCancel?.(booking)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60">
              <Trash2 aria-hidden="true" size={14} />{busy ? "Đang hủy…" : "Hủy lịch"}
            </button>
          ) : (
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Đã kết thúc</span>
          )}
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <MapPin aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <div><dt className="text-xs text-slate-400">Địa điểm</dt><dd className="font-semibold text-slate-800">{ROOMS[booking.roomId] ?? booking.roomId}</dd></div>
          </div>
          <div className="flex items-start gap-2.5">
            <UsersRound aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <div><dt className="text-xs text-slate-400">Người tham gia</dt><dd className="font-semibold text-slate-800">{booking.attendees} người <span className="text-slate-300">·</span> {booking.department}</dd></div>
          </div>
        </dl>
      </div>
    </li>
  );
}

function SectionTitle({ title, note, count }: { title: string; note?: string; count: number }) {
  return (
    <h2 className="flex flex-wrap items-center gap-2 px-5 py-4 text-base font-bold text-slate-900 sm:px-6">
      {title}{note && <span className="text-sm font-normal text-slate-500">{note}</span>}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{count}</span>
    </h2>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 bg-slate-50 px-5 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/70 text-slate-400"><CalendarX2 aria-hidden="true" size={22} /></span>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

export default function MyMeetingsPage() {
  const [data, setData] = useState<{ upcoming: MyMeetingBooking[]; past: MyMeetingBooking[] } | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    getMyMeetingBookings(signal)
      .then((result) => { setData(result); setError(""); })
      .catch((reason) => { if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Không tải được lịch họp."); });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const cancel = async (booking: MyMeetingBooking) => {
    if (cancelling) return;
    if (!window.confirm(`Hủy cuộc họp "${booking.title}" lúc ${booking.start} ngày ${formatDate(booking.date)}?`)) return;
    setCancelling(booking.id);
    try {
      await cancelMyBooking(booking.id);
      setData((current) => current ? { ...current, upcoming: current.upcoming.filter((item) => item.id !== booking.id) } : current);
      window.dispatchEvent(new Event("asia-notifications-changed"));
      showToast("Đã hủy lịch họp", booking.title, "success");
    } catch (reason) {
      showToast("Không hủy được lịch họp", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
      load();
    } finally { setCancelling(null); }
  };

  return (
    <AccountShell
      title="Lịch họp của tôi"
      description="Các cuộc họp bạn đã đặt. Bạn được nhắc qua email và thông báo trước 15 phút."
      action={<Link href="/user/meeting" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"><Plus aria-hidden="true" size={16} />Đặt phòng họp</Link>}
    >
      {error ? (
        <Card><p role="alert" className="text-sm text-rose-600">{error}</p></Card>
      ) : !data ? (
        <Card><p role="status" className="text-sm text-slate-500">Đang tải lịch họp…</p></Card>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <section aria-label="Sắp tới">
            <SectionTitle title="Sắp tới" count={data.upcoming.length} />
            {data.upcoming.length ? (
              <ul className="space-y-3 px-5 pb-5 sm:px-6">{data.upcoming.map((booking) => <MeetingRow key={booking.id} booking={booking} onCancel={cancel} busy={cancelling === booking.id} />)}</ul>
            ) : <EmptyState text="Bạn chưa có cuộc họp nào sắp diễn ra." />}
          </section>
          <section aria-label="Đã diễn ra" className="border-t border-slate-100">
            <SectionTitle title="Đã diễn ra" note="(15 ngày gần nhất)" count={data.past.length} />
            {data.past.length ? (
              <ul className="space-y-3 bg-slate-50/60 px-5 py-5 sm:px-6">{data.past.map((booking) => <MeetingRow key={booking.id} booking={booking} />)}</ul>
            ) : <EmptyState text="Chưa có cuộc họp nào trong 15 ngày qua." />}
          </section>
        </div>
      )}
    </AccountShell>
  );
}
