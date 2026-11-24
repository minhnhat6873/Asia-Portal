"use client";

import Link from "next/link";
import { CalendarClock, CarFront, CircleCheck, ImagePlus, MapPin, Pencil, Phone, Plus, X } from "lucide-react";
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

function TripCard({ trip, onCancel, onArrived }: { trip: VehicleTrip; onCancel: (trip: VehicleTrip) => void; onArrived: (trip: VehicleTrip) => void }) {
  return (
    <li className="border-b border-slate-100 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TripStatusBadge status={trip.status} />
            <span className="text-xs font-semibold text-slate-500">{VEHICLE_PURPOSE_LABELS[trip.purpose]}</span>
          </div>
          <p className="mt-2 truncate text-base font-bold text-slate-900" title={trip.customerName}>{trip.customerName}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5"><CalendarClock aria-hidden="true" size={15} />{formatTripTime(trip.departAt)}{trip.roundTrip && trip.returnAt ? ` · về ${formatTripTime(trip.returnAt)}` : ""}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" size={15} className="shrink-0" /><span className="truncate">{trip.pickup} → {trip.destination}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {trip.status === "pending" && <>
            <Link href={`/vehicles?edit=${encodeURIComponent(trip.id)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil aria-hidden="true" size={15} />Sửa</Link>
            <button type="button" onClick={() => onCancel(trip)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100">Hủy</button>
          </>}
          {trip.status === "arranged" && (
            <button type="button" onClick={() => onArrived(trip)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800"><CircleCheck aria-hidden="true" size={16} />Đã đi xong</button>
          )}
        </div>
      </div>
      {trip.purpose === "delivery" && (trip.senderName || trip.receiverName) && (
        <p className="mt-2 text-sm text-slate-600">Gửi: <strong className="text-slate-800">{trip.senderName}</strong> · {trip.senderPhone} — Nhận: <strong className="text-slate-800">{trip.receiverName}</strong> · {trip.receiverPhone}</p>
      )}
      {trip.vehicleType && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
          <span className="inline-flex items-center gap-1.5 font-semibold"><CarFront aria-hidden="true" size={15} />{VEHICLE_TYPE_LABELS[trip.vehicleType]}</span>
          {(trip.driverName || trip.driverPlate || trip.driverPhone) && (
            <span className="ml-2 text-slate-600">· {[trip.driverName, trip.driverPlate].filter(Boolean).join(" · ")}{trip.driverPhone && <> · <a href={`tel:${trip.driverPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Phone aria-hidden="true" size={13} />{trip.driverPhone}</a></>}</span>
          )}
          {trip.status === "completed" && trip.vehicleType === "external" && <span className="ml-2 text-slate-600">· Chi phí: <strong>{formatVnd(trip.actualCost)}</strong></span>}
        </div>
      )}
      {trip.cancel && <p className="mt-2 text-sm text-slate-500">{trip.cancel.byRequester ? "Bạn đã hủy" : `${trip.cancel.byName || "HR"} đã hủy`}: {trip.cancel.reason}</p>}
    </li>
  );
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<VehicleTrip[] | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<VehicleTrip | null>(null);
  const [arriving, setArriving] = useState<VehicleTrip | null>(null);

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

  return (
    <AccountShell title="Chuyến xe của tôi" description="Các yêu cầu đặt xe bạn đã gửi. Bạn được nhắc trước giờ đi 15 phút.">
      <ConfirmDialog open={Boolean(cancelling)} title="Hủy yêu cầu đặt xe?" description="HR sẽ không sắp xếp xe cho chuyến này nữa." cancelLabel="Giữ yêu cầu" confirmLabel="Hủy yêu cầu" onCancel={() => setCancelling(null)} onConfirm={() => void confirmCancel()} />
      {arriving && <ArrivedDialog trip={arriving} onClose={() => setArriving(null)} onDone={(trip) => { replace(trip); setArriving(null); }} />}
      {error ? <Card><p role="alert" className="text-sm text-rose-600">{error}</p></Card>
        : !trips ? <Card><p role="status" className="text-sm text-slate-500">Đang tải chuyến xe…</p></Card>
          : (
            <div className="space-y-5">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900">Đang xử lý <span className="font-medium text-slate-400">({active.length})</span></h2>
                  <Link href="/vehicles" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"><Plus aria-hidden="true" size={16} />Đặt xe</Link>
                </div>
                {active.length ? <ul className="mt-2">{active.map((trip) => <TripCard key={trip.id} trip={trip} onCancel={setCancelling} onArrived={setArriving} />)}</ul>
                  : <p className="mt-4 text-sm text-slate-500">Bạn chưa có chuyến xe nào đang xử lý.</p>}
              </Card>
              <Card>
                <h2 className="text-base font-bold text-slate-900">Đã xong / đã hủy (60 ngày gần nhất) <span className="font-medium text-slate-400">({past.length})</span></h2>
                {past.length ? <ul className="mt-2">{past.map((trip) => <TripCard key={trip.id} trip={trip} onCancel={setCancelling} onArrived={setArriving} />)}</ul>
                  : <p className="mt-4 text-sm text-slate-500">Chưa có chuyến xe nào.</p>}
              </Card>
            </div>
          )}
    </AccountShell>
  );
}
