"use client";

import Link from "next/link";
import { CarFront, CircleCheck, CircleHelp, CirclePlus, Clock, ImagePlus, Pencil, Phone, X } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { showToast } from "@/features/admin/auth/notify";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  cancelMyTrip,
  formatTripTime,
  formatVnd,
  getMyTrips,
  markTripArrived,
  VEHICLE_PURPOSE_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  VEHICLE_TYPE_LABELS,
  type VehicleTrip,
} from "@/services/vehicle.service";
import AccountShell, { Card } from "./AccountShell";

const MAX_FILES = 3;

export function TripStatusBadge({ status }: { status: VehicleTrip["status"] }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[status]}`}>{VEHICLE_STATUS_LABELS[status]}</span>;
}

/** "Đã đi xong": optional pictures (receipt, delivery proof), then HR closes the trip. */
function ArrivedDialog({ trip, onClose, onDone }: { trip: VehicleTrip; onClose: () => void; onDone: (trip: VehicleTrip) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    const valid = chosen.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (valid.length < chosen.length) showToast("Có ảnh không hợp lệ", "Chỉ nhận ảnh JPG, PNG, WEBP tối đa 5MB.", "error");
    setFiles((current) => [...current, ...valid].slice(0, MAX_FILES));
  };
  const submit = async () => {
    setSaving(true);
    try {
      onDone(await markTripArrived(trip.id, files));
      showToast("Đã báo HR", "HR sẽ vào chốt chuyến xe.", "success");
    } catch (reason) {
      showToast("Chưa gửi được", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setSaving(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="arrived-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="arrived-title" className="text-lg font-bold text-slate-900">Báo đã đi xong</h2>
        <p className="mt-1 text-sm text-slate-600">HR sẽ được báo để chốt chuyến. Bạn có thể gửi kèm ảnh hóa đơn, ảnh chụp Grab hoặc ảnh giao hàng (không bắt buộc, tối đa {MAX_FILES} ảnh).</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700">
              <span className="max-w-40 truncate">{file.name}</span>
              <button type="button" aria-label={`Bỏ ảnh ${file.name}`} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))} className="text-slate-500 hover:text-rose-600"><X aria-hidden="true" size={14} /></button>
            </span>
          ))}
          {files.length < MAX_FILES && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
              <ImagePlus aria-hidden="true" size={15} />Thêm ảnh
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pick} />
            </label>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Đóng</button>
          <button type="button" disabled={saving} onClick={() => void submit()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? "Đang gửi…" : "Báo đã đi xong"}</button>
        </div>
      </div>
    </div>
  );
}

/** Màu theo trạng thái: viền trái của thẻ, chấm trong nhãn và giờ đón. */
const STATUS_STYLES: Record<VehicleTrip["status"], { bar: string; dot: string; time: string }> = {
  pending: { bar: "border-l-amber-400", dot: "bg-amber-500", time: "text-amber-600" },
  arranged: { bar: "border-l-blue-500", dot: "bg-blue-500", time: "text-blue-600" },
  arrived: { bar: "border-l-violet-500", dot: "bg-violet-500", time: "text-violet-600" },
  completed: { bar: "border-l-emerald-500", dot: "bg-emerald-500", time: "text-emerald-700" },
  cancelled: { bar: "border-l-slate-300", dot: "bg-slate-400", time: "text-slate-500" },
};
const VN_CLOCK = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const VN_DATE = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const initial = (name: string) => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() || "?";

function TripCard({ trip, onCancel, onArrived }: { trip: VehicleTrip; onCancel: (trip: VehicleTrip) => void; onArrived: (trip: VehicleTrip) => void }) {
  const [showExtraDestinations, setShowExtraDestinations] = useState(false);
  const style = STATUS_STYLES[trip.status];
  const depart = new Date(trip.departAt);
  const person = trip.customerName || trip.forOtherName || "—";
  return (
    <li className={`overflow-hidden rounded-2xl border border-l-4 border-slate-200 bg-white shadow-sm ${style.bar}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[trip.status]}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{VEHICLE_STATUS_LABELS[trip.status]}</span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{VEHICLE_PURPOSE_LABELS[trip.purpose]}</span>
        </div>
        <div className="flex flex-wrap gap-2 empty:hidden">
          {trip.status === "pending" && <>
            <Link href={`/user/vehicles?edit=${encodeURIComponent(trip.id)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil aria-hidden="true" size={14} />Sửa</Link>
            <button type="button" onClick={() => onCancel(trip)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">Hủy</button>
          </>}
          {trip.status === "arranged" && (
            <button type="button" onClick={() => onArrived(trip)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"><CircleCheck aria-hidden="true" size={15} />Xác nhận đi xong</button>
          )}
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-4 md:border-r md:border-slate-100 md:pr-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{trip.purpose === "delivery" ? "Khách hàng" : "Hành khách"}</p>
            <p className="mt-2 flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{initial(person)}</span>
              <span className="truncate font-bold text-slate-900" title={person}>{person}</span>
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
            {trip.vehicleType ? <CarFront aria-hidden="true" size={13} /> : <CircleHelp aria-hidden="true" size={13} />}
            {trip.vehicleType ? VEHICLE_TYPE_LABELS[trip.vehicleType] : "Chưa xác định xe"}
          </span>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"><Clock aria-hidden="true" size={18} /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Thời gian đón</p>
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className={`text-lg font-extrabold ${style.time}`}>{VN_CLOCK.format(depart)}</span>
                <span aria-hidden="true" className="text-slate-300">●</span>
                <span className="font-semibold text-slate-800">{VN_DATE.format(depart)}</span>
                {trip.roundTrip && trip.returnAt && <span className="text-slate-500">· về {formatTripTime(trip.returnAt)}</span>}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Lộ trình</p>
            </div>
            <ol className="relative mt-2 space-y-3 text-sm text-slate-700">
              <span aria-hidden="true" className="absolute bottom-2 left-[4.5px] top-2 border-l border-dashed border-slate-300" />
              <li className="relative flex items-center gap-3"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-emerald-500 bg-white" /><span className="truncate" title={trip.pickup}>{trip.pickup}</span></li>
              <li className="relative flex items-center gap-3"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-slate-400 bg-white" />{trip.destination ? <span className="truncate" title={trip.destination}>{trip.destination}</span> : <span className="italic text-slate-400">(Chưa xác định điểm đến)</span>}</li>
              {showExtraDestinations && trip.extraDestinations?.map((destination, index) => <li key={index} className="relative flex items-start gap-3"><span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-slate-400 bg-white" /><span className="min-w-0 break-words">{destination}</span></li>)}
            </ol>
            {(trip.extraDestinations?.length ?? 0) > 0 && <button type="button" aria-expanded={showExtraDestinations} onClick={() => setShowExtraDestinations(value => !value)} className="mt-2 ml-5 rounded text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{showExtraDestinations ? "Thu gọn" : `Xem thêm ${trip.extraDestinations!.length} điểm đến`}</button>}
          </div>
        </div>
      </div>

      <div className="space-y-2 px-5 pb-4 empty:hidden">
      {trip.forOther && (
        <p className="text-sm text-slate-600">Đặt giúp: <strong className="text-slate-800">{trip.forOtherName}</strong> · {trip.forOtherPhone}</p>
      )}
      {trip.purpose === "delivery" && (trip.senderName || trip.receiverName) && (
        <p className="text-sm text-slate-600">Gửi: <strong className="text-slate-800">{trip.senderName}</strong> · {trip.senderPhone} — Nhận: <strong className="text-slate-800">{trip.receiverName}</strong> · {trip.receiverPhone}{trip.goodsQuantity && <> — Hàng: <strong className="text-slate-800">{trip.goodsQuantity}</strong></>}</p>
      )}
      {trip.vehicleType && (trip.driverName || trip.driverPlate || trip.driverPhone || trip.status === "completed") && (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          {(trip.driverName || trip.driverPlate || trip.driverPhone) && (
            <span>Tài xế: {[trip.driverName, trip.driverPlate].filter(Boolean).join(" · ")}{trip.driverPhone && <> · <a href={`tel:${trip.driverPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Phone aria-hidden="true" size={13} />{trip.driverPhone}</a></>}</span>
          )}
          {trip.status === "completed" && trip.actualEndAt && <span className="ml-2">· Hoàn thành lúc <strong>{formatTripTime(trip.actualEndAt)}</strong></span>}
          {trip.status === "completed" && trip.vehicleType === "external" && <span className="ml-2">· Chi phí: <strong>{formatVnd(trip.actualCost)}</strong></span>}
        </div>
      )}
      {(trip.changes ?? []).length > 0 && (() => {
        // The latest change HR made to the requested time or route (and why), or a note from HR.
        const change = trip.changes[trip.changes.length - 1];
        return (
          <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950 ring-1 ring-amber-100">
            {change.items.length ? <>
              <p className="font-semibold">HR đã thay đổi so với yêu cầu của bạn:</p>
              {change.items.map((item) => <p key={item.label}>{item.label}: <span className="text-amber-800 line-through">{item.from}</span> → <strong>{item.to}</strong></p>)}
              <p className="mt-1">Lý do: {change.reason}</p>
            </> : <p><span className="font-semibold">Lời nhắn của HR:</span> {change.reason}</p>}
          </div>
        );
      })()}
      {trip.cancel && <p className="text-sm text-slate-500">{trip.cancel.byRequester ? "Bạn đã hủy" : `${trip.cancel.byName || "HR"} đã hủy`}: {trip.cancel.reason}</p>}
      </div>
    </li>
  );
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<VehicleTrip[] | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<VehicleTrip | null>(null);
  const [arriving, setArriving] = useState<VehicleTrip | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const load = useCallback((signal?: AbortSignal) => {
    getMyTrips(signal).then((items) => { setTrips(items); setError(""); })
      .catch((reason) => { if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Không tải được chuyến xe."); });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const replace = (trip: VehicleTrip) => setTrips((current) => current?.map((item) => (item.id === trip.id ? trip : item)) ?? null);
  const confirmCancel = async () => {
    const trip = cancelling;
    setCancelling(null);
    if (!trip) return;
    try {
      replace(await cancelMyTrip(trip.id));
      showToast("Đã hủy yêu cầu đặt xe", trip.customerName, "success");
    } catch (reason) {
      showToast("Không hủy được", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
      load();
    }
  };

  const active = trips?.filter((trip) => ["pending", "arranged", "arrived"].includes(trip.status)) ?? [];
  const past = trips?.filter((trip) => ["completed", "cancelled"].includes(trip.status)) ?? [];
  const shown = tab === "active" ? active : past;
  const tabs = [
    { id: "active", label: "Đang xử lý", count: active.length },
    { id: "history", label: "Lịch sử", count: past.length },
  ] as const;

  return (
    <AccountShell
      title="Chuyến xe của tôi"
      description="Quản lý các yêu cầu đặt xe. Bạn sẽ được nhắc nhở 15 phút trước giờ đi."
      action={<Link href="/user/vehicles" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"><CirclePlus aria-hidden="true" size={17} />Đặt xe mới</Link>}
    >
      <ConfirmDialog open={Boolean(cancelling)} title="Hủy yêu cầu đặt xe?" description="HR sẽ không sắp xếp xe cho chuyến này nữa." cancelLabel="Giữ yêu cầu" confirmLabel="Hủy yêu cầu" onCancel={() => setCancelling(null)} onConfirm={() => void confirmCancel()} />
      {arriving && <ArrivedDialog trip={arriving} onClose={() => setArriving(null)} onDone={(trip) => { replace(trip); setArriving(null); }} />}
      {error ? <Card><p role="alert" className="text-sm text-rose-600">{error}</p></Card>
        : !trips ? <Card><p role="status" className="text-sm text-slate-500">Đang tải chuyến xe…</p></Card>
          : (
            <div>
              <div role="tablist" aria-label="Chuyến xe" className="mb-5 flex gap-6 border-b border-slate-200">
                {tabs.map(({ id, label, count }) => {
                  const selected = tab === id;
                  return (
                    <button key={id} type="button" role="tab" id={`trips-tab-${id}`} aria-selected={selected} aria-controls="trips-panel" onClick={() => setTab(id)}
                      className={`-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors ${selected ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                      {label}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div role="tabpanel" id="trips-panel" aria-labelledby={`trips-tab-${tab}`}>
                {tab === "history" && <p className="mb-3 text-xs text-slate-500">Các chuyến đã xong hoặc đã hủy trong 60 ngày gần nhất.</p>}
                {shown.length ? <ul className="space-y-4">{shown.map((trip) => <TripCard key={trip.id} trip={trip} onCancel={setCancelling} onArrived={setArriving} />)}</ul>
                  : <Card><p className="text-sm text-slate-500">{tab === "active" ? "Bạn chưa có chuyến xe nào đang xử lý." : "Chưa có chuyến xe nào."}</p></Card>}
              </div>
            </div>
          )}
    </AccountShell>
  );
}
