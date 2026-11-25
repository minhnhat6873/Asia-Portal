"use client";

import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Plus, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cancelMyBooking, getMyMeetingBookings, type MyMeetingBooking } from "@/services/meeting.service";
import { showToast } from "@/features/admin/auth/notify";
import AccountShell, { Card } from "./AccountShell";

const ROOMS: Record<string, string> = { "room-01": "Phòng 1 · Tầng 1", "room-02": "Phòng 2 · Tầng 1" };
const formatDate = (value: string) => value.split("-").reverse().join("/");

function MeetingRow({ booking, onCancel, busy }: { booking: MyMeetingBooking; onCancel?: (booking: MyMeetingBooking) => void; busy?: boolean }) {
  return (
    <li className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-slate-900" title={booking.title}>{booking.title}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={15} />{formatDate(booking.date)}</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" size={15} />{booking.start} – {booking.end}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={15} />{ROOMS[booking.roomId] ?? booking.roomId}</span>
          <span className="inline-flex items-center gap-1.5"><UsersRound aria-hidden="true" size={15} />{booking.attendees} người · {booking.department}</span>
        </div>
      </div>
      {onCancel && (
        <button type="button" disabled={busy} onClick={() => onCancel(booking)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60">
          <Trash2 aria-hidden="true" size={16} />Hủy lịch
        </button>
      )}
    </li>
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
    <AccountShell title="Lịch họp của tôi" description="Các cuộc họp bạn đã đặt. Bạn được nhắc qua email và thông báo trước 15 phút.">
      {error ? (
        <Card><p role="alert" className="text-sm text-rose-600">{error}</p></Card>
      ) : !data ? (
        <Card><p role="status" className="text-sm text-slate-500">Đang tải lịch họp…</p></Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">Sắp tới <span className="font-medium text-slate-400">({data.upcoming.length})</span></h2>
              <Link href="/user/meeting" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"><Plus aria-hidden="true" size={16} />Đặt phòng họp</Link>
            </div>
            {data.upcoming.length ? (
              <ul className="mt-2">{data.upcoming.map((booking) => <MeetingRow key={booking.id} booking={booking} onCancel={cancel} busy={cancelling === booking.id} />)}</ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Bạn chưa có cuộc họp nào sắp diễn ra.</p>
            )}
          </Card>
          <Card>
            <h2 className="text-base font-bold text-slate-900">Đã diễn ra (15 ngày gần nhất) <span className="font-medium text-slate-400">({data.past.length})</span></h2>
            {data.past.length ? (
              <ul className="mt-2">{data.past.map((booking) => <MeetingRow key={booking.id} booking={booking} />)}</ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Chưa có cuộc họp nào trong 15 ngày qua.</p>
            )}
          </Card>
        </div>
      )}
    </AccountShell>
  );
}
