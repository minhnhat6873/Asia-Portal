"use client";

import { CarFront, ImagePlus, Trash2, X } from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DateTimeInput, { isCompleteDateTime } from "@/components/ui/DateTimeInput";
import { ApiError } from "@/services/api";
import {
  arrangeVehicleTrip,
  cancelVehicleTrip,
  completeVehicleTrip,
  deleteVehicleTrip,
  formatTripTime,
  formatVnd,
  mapLink,
  toLocalInput,
  VEHICLE_PURPOSE_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  VEHICLE_TYPE_LABELS,
  type VehicleArrangeInput,
  type VehicleTrip,
  type VehicleType,
} from "@/services/vehicle.service";

const INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
const MAX_FILES = 3;
/** "YYYY-MM-DDTHH:mm" (Vietnam time) shown as "HH:mm DD/MM/YYYY". */
const formatLocal = (value: string) => `${value.slice(11, 16)} ${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
/**
 * TẠM ĐỂ TEST: true cho phép chốt chuyến với giờ hoàn thành thật ở tương lai.
 * Test xong đổi về false (cùng VEHICLE_ALLOW_FUTURE_END trong backend vehicle-booking.service.ts).
 */
const VEHICLE_ALLOW_FUTURE_END = true;
const errorText = (reason: unknown, fallback: string) =>
  reason instanceof ApiError ? Object.values(reason.fieldErrors)[0] ?? reason.message : reason instanceof Error ? reason.message : fallback;
const money = (value: string) => (value.trim() ? Number(value.replace(/[^\d]/g, "")) : null);

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-sm font-semibold text-slate-800">{children || "—"}</dd></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-100 p-4"><h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>{children}</section>;
}

/** Everything HR does with one trip: choose the car, edit, close, cancel, delete. */
export default function VehicleTripDialog({ trip, canDelete, onClose, onChanged, onDeleted }: {
  trip: VehicleTrip;
  canDelete: boolean;
  onClose: () => void;
  onChanged: (trip: VehicleTrip) => void;
  onDeleted: (id: string) => void;
}) {
  const open = ["pending", "arranged", "arrived"].includes(trip.status);
  const [vehicleType, setVehicleType] = useState<VehicleType | "">(trip.vehicleType ?? "");
  const [estimatedCost, setEstimatedCost] = useState(trip.estimatedCost ? String(trip.estimatedCost) : "");
  const [driver, setDriver] = useState({ driverName: trip.driverName, driverPlate: trip.driverPlate, driverPhone: trip.driverPhone });
  const [times, setTimes] = useState({ departAt: toLocalInput(trip.departAt), returnAt: toLocalInput(trip.returnAt), expectedEndAt: toLocalInput(trip.expectedEndAt) });
  const [route, setRoute] = useState({ pickup: trip.pickup, destination: trip.destination });
  // Why HR changes the requested time or route; sent to the requester (web and email).
  const [changeReason, setChangeReason] = useState("");
  const requested = { departAt: toLocalInput(trip.departAt), returnAt: toLocalInput(trip.returnAt), pickup: trip.pickup, destination: trip.destination };
  const requestChanges = [
    times.departAt !== requested.departAt && `Giờ đi: ${formatTripTime(trip.departAt)} → ${times.departAt ? formatLocal(times.departAt) : "—"}`,
    trip.roundTrip && times.returnAt !== requested.returnAt && `Giờ về: ${formatTripTime(trip.returnAt)} → ${times.returnAt ? formatLocal(times.returnAt) : "—"}`,
    route.pickup.trim() !== requested.pickup.trim() && "Điểm đón",
    route.destination.trim() !== requested.destination.trim() && "Điểm đến",
  ].filter((item): item is string => Boolean(item));
  const [actualCost, setActualCost] = useState(trip.actualCost ? String(trip.actualCost) : trip.estimatedCost ? String(trip.estimatedCost) : "");
  // When the trip really ended: the requester's "Đã đi xong" time if any, else the expected
  // end once it has passed, else now. HR corrects it before closing.
  const [actualEndAt, setActualEndAt] = useState(() => {
    if (trip.actualEndAt) return toLocalInput(trip.actualEndAt);
    if (trip.arrivedAt) return toLocalInput(trip.arrivedAt);
    const now = new Date().toISOString();
    return toLocalInput(trip.expectedEndAt && trip.expectedEndAt < now ? trip.expectedEndAt : now);
  });
  const [files, setFiles] = useState<File[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "complete" | "cancel" | "delete">("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!vehicleType) { toast.error("Vui lòng chọn xe công ty hoặc xe ngoài."); return; }
    if (!isCompleteDateTime(times.expectedEndAt)) { toast.error("Vui lòng chọn đủ ngày và giờ hoàn thành dự kiến."); return; }
    if (!isCompleteDateTime(times.departAt)) { toast.error("Vui lòng chọn đủ ngày và giờ đi."); return; }
    if (trip.roundTrip && !isCompleteDateTime(times.returnAt)) { toast.error("Vui lòng chọn đủ ngày và giờ về."); return; }
    const message = changeReason.trim();
    if (requestChanges.length && message.length < 3) { toast.error("Bạn đã đổi giờ hoặc lộ trình. Vui lòng nhập lý do thay đổi để báo cho người đặt."); document.getElementById("vehicle-change-reason")?.focus(); return; }
    if (message && message.length < 3) { toast.error("Lời nhắn cho người đặt cần ít nhất 3 ký tự."); document.getElementById("vehicle-change-reason")?.focus(); return; }
    // Only changed trip fields are sent (a changed time restarts its reminders on the server).
    const input: VehicleArrangeInput = { vehicleType };
    // Whatever is typed is sent: the reason for a change, or a note when nothing changed.
    if (message) input.changeReason = message;
    const original = { departAt: toLocalInput(trip.departAt), returnAt: toLocalInput(trip.returnAt), expectedEndAt: toLocalInput(trip.expectedEndAt), pickup: trip.pickup, destination: trip.destination };
    const edited = { ...times, ...route };
    for (const key of Object.keys(edited) as (keyof typeof edited)[]) {
      if (edited[key] !== original[key]) Object.assign(input, { [key]: key === "returnAt" ? edited.returnAt || null : edited[key] });
    }
    if (vehicleType === "external") {
      const cost = money(estimatedCost);
      if (!cost) { toast.error("Xe ngoài cần nhập giá dự kiến."); return; }
      input.estimatedCost = cost;
    }
    if (vehicleType === "company") Object.assign(input, driver);
    setBusy("save");
    try {
      onChanged(await arrangeVehicleTrip(trip.id, input));
      setChangeReason("");
      toast.success(input.changeReason
        ? requestChanges.length ? "Đã lưu. Người đặt đã nhận thông báo và email kèm lý do thay đổi." : "Đã lưu. Lời nhắn đã gửi cho người đặt (thông báo và email)."
        : trip.status === "pending" ? "Đã sắp xếp xe. Người đặt đã được báo." : "Đã lưu thay đổi. Người đặt đã được báo.");
      // Show what was just sent (the list sits higher up in the dialog).
      if (input.changeReason) window.setTimeout(() => document.getElementById("vehicle-change-history")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch (error) { toast.error(errorText(error, "Không lưu được chuyến xe.")); } finally { setBusy(""); }
  };

  const complete = async () => {
    const cost = money(actualCost);
    if (!isCompleteDateTime(actualEndAt)) { toast.error("Vui lòng chọn đủ ngày và giờ hoàn thành thật."); return; }
    if (actualEndAt <= toLocalInput(trip.departAt)) { toast.error("Thời gian hoàn thành thật phải sau giờ đi."); return; }
    if (!VEHICLE_ALLOW_FUTURE_END && actualEndAt > toLocalInput(new Date().toISOString())) { toast.error("Thời gian hoàn thành thật không được ở tương lai."); return; }
    if (trip.vehicleType === "external" && !cost) { toast.error("Xe ngoài cần nhập giá thật trước khi chốt."); return; }
    setBusy("complete");
    try {
      onChanged(await completeVehicleTrip(trip.id, { actualCost: trip.vehicleType === "external" ? cost : null, actualEndAt }, files));
      setFiles([]);
      toast.success("Đã chốt chuyến xe.");
    } catch (error) { toast.error(errorText(error, "Không chốt được chuyến xe.")); } finally { setBusy(""); }
  };

  const cancel = async () => {
    if (reason.trim().length < 3) { toast.error("Vui lòng nhập lý do hủy (ít nhất 3 ký tự)."); return; }
    setBusy("cancel");
    try {
      onChanged(await cancelVehicleTrip(trip.id, reason.trim()));
      toast.success("Đã hủy chuyến xe. Người đặt đã được báo.");
    } catch (error) { toast.error(errorText(error, "Không hủy được chuyến xe.")); } finally { setBusy(""); }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy("delete");
    try {
      await deleteVehicleTrip(trip.id);
      toast.success("Đã xóa chuyến xe.");
      onDeleted(trip.id);
    } catch (error) { toast.error(errorText(error, "Không xóa được chuyến xe.")); } finally { setBusy(""); }
  };

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    event.target.value = "";
    setFiles((current) => [...current, ...chosen].slice(0, MAX_FILES));
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="vehicle-trip-title" className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <ConfirmDialog open={confirmDelete} title="Xóa hẳn chuyến xe này?" description="Chuyến đã hủy sẽ bị xóa khỏi hệ thống cùng ảnh đính kèm. Không thể hoàn tác." cancelLabel="Giữ lại" confirmLabel="Xóa chuyến" onCancel={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[trip.status]}`}>{VEHICLE_STATUS_LABELS[trip.status]}</span>
              <span className="text-xs font-semibold text-slate-500">{VEHICLE_PURPOSE_LABELS[trip.purpose]}</span>
            </div>
            <h2 id="vehicle-trip-title" className="mt-1.5 truncate text-lg font-extrabold text-slate-900">{trip.customerName}</h2>
          </div>
          <button type="button" aria-label="Đóng" disabled={Boolean(busy)} onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X aria-hidden="true" size={18} /></button>
        </header>

        <div className="space-y-4 p-5">
          <Section title="Yêu cầu">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Info label="Người đặt">{trip.requester.name}<span className="block text-xs font-normal text-slate-500">{trip.requester.department || "—"} · {trip.requester.email}</span></Info>
              {trip.forOther && <Info label="Đặt giúp cho">{trip.forOtherName}<a href={`tel:${trip.forOtherPhone.replace(/\s/g, "")}`} className="block text-xs font-semibold text-emerald-700">{trip.forOtherPhone}</a></Info>}
              <Info label="Giờ đi">{formatTripTime(trip.departAt)}{trip.roundTrip ? <span className="block text-xs font-normal text-slate-500">Về: {formatTripTime(trip.returnAt)}</span> : null}</Info>
              <Info label="Hoàn thành dự kiến">{formatTripTime(trip.expectedEndAt)}</Info>
              <Info label="Lộ trình">{trip.pickup} → {trip.destination}{trip.pickupLocation && <a href={mapLink(trip.pickupLocation)} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs font-semibold text-emerald-700 underline">Xem điểm đón trên bản đồ{trip.pickupLocation.accuracy ? ` (±${trip.pickupLocation.accuracy} m)` : ""}</a>}</Info>
              {trip.purpose === "guest" ? <>
                <Info label="Khách">{trip.passengerCount ?? "—"} người</Info>
                <Info label="SĐT khách">{trip.customerPhone}</Info>
              </> : <>
                <Info label="Người gửi">{trip.senderName}<span className="block text-xs font-normal text-slate-500">{trip.senderPhone}</span></Info>
                <Info label="Người nhận">{trip.receiverName}<span className="block text-xs font-normal text-slate-500">{trip.receiverPhone}</span></Info>
                <Info label="Hàng hóa">{trip.goodsDescription}{trip.goodsQuantity && <span className="block text-xs font-normal text-slate-500">Số lượng / khối lượng: {trip.goodsQuantity}</span>}</Info>
              </>}
            </dl>
            {trip.note && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="block text-xs font-semibold text-slate-500">Ghi chú của người đặt</span>{trip.note}</p>}
          </Section>

          {(trip.changes ?? []).length > 0 && (
            <Section title="Thay đổi và lời nhắn đã gửi người đặt">
              <ul id="vehicle-change-history" className="space-y-2.5">
                {(trip.changes ?? []).map((change) => (
                  <li key={change.at} className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950 ring-1 ring-amber-100">
                    {change.items.map((item) => <p key={item.label}><strong>{item.label}:</strong> {item.from} → {item.to}</p>)}
                    <p className={change.items.length ? "mt-1" : ""}><strong>{change.items.length ? "Lý do:" : "Lời nhắn:"}</strong> {change.reason}</p>
                    <p className="mt-1 text-xs text-amber-800">{change.byName} · {formatTripTime(change.at)} · đã báo người đặt</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {trip.receipts.length > 0 && (
            <Section title="Ảnh đính kèm">
              <div className="flex flex-wrap gap-2">
                {trip.receipts.map((receipt) => (
                  <a key={receipt.url} href={receipt.url} target="_blank" rel="noopener noreferrer" className="group relative block h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary receipt thumbnails */}
                    <img src={receipt.url} alt={`Ảnh do ${receipt.uploadedBy === "hr" ? "HR" : "người đặt"} gửi`} className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 text-center text-[10px] text-white">{receipt.uploadedBy === "hr" ? "HR" : "Người đặt"}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {open ? (
            <Section title={trip.status === "pending" ? "Sắp xếp xe" : "Xe và thông tin chuyến"}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["company", "external"] as const).map((type) => (
                  <label key={type} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-semibold ${vehicleType === type ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
                    <input type="radio" name="vehicle-type" checked={vehicleType === type} onChange={() => setVehicleType(type)} className="h-4 w-4 accent-emerald-700" />
                    <CarFront aria-hidden="true" size={17} />{VEHICLE_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
              {vehicleType === "external" && (
                <label className="mt-3 block text-sm font-semibold text-slate-700">Giá dự kiến (VND) <span className="text-rose-500">*</span>
                  <input inputMode="numeric" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value.replace(/[^\d]/g, ""))} placeholder="Ví dụ: 150000" className={`${INPUT} mt-1.5`} />
                </label>
              )}
              {vehicleType === "company" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm font-semibold text-slate-700">Tài xế<input maxLength={100} value={driver.driverName} onChange={(event) => setDriver({ ...driver, driverName: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                  <label className="text-sm font-semibold text-slate-700">Biển số<input maxLength={20} value={driver.driverPlate} onChange={(event) => setDriver({ ...driver, driverPlate: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                  <label className="text-sm font-semibold text-slate-700">SĐT tài xế<input type="tel" maxLength={20} value={driver.driverPhone} onChange={(event) => setDriver({ ...driver, driverPhone: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                </div>
              )}
              <div className="mt-3 sm:w-2/3">
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Hoàn thành dự kiến <span className="text-rose-500">*</span></p>
                <DateTimeInput dateLabel="Ngày hoàn thành dự kiến" timeLabel="Giờ hoàn thành dự kiến" min={isCompleteDateTime(times.departAt) ? times.departAt : undefined} value={times.expectedEndAt} onChange={(value) => setTimes((current) => ({ ...current, expectedEndAt: value }))} />
                <p className="mt-1 text-xs text-slate-500">Quá giờ này mà chưa chốt chuyến, HR sẽ được nhắc.</p>
              </div>
              <details className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Sửa thời gian và lộ trình</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="text-sm font-semibold text-slate-700"><p className="mb-1.5">Ngày và giờ đi</p><DateTimeInput dateLabel="Ngày đi" timeLabel="Giờ đi" value={times.departAt} onChange={(value) => setTimes((current) => ({ ...current, departAt: value }))} /></div>
                  {trip.roundTrip && <div className="text-sm font-semibold text-slate-700"><p className="mb-1.5">Ngày và giờ về</p><DateTimeInput dateLabel="Ngày về" timeLabel="Giờ về" min={isCompleteDateTime(times.departAt) ? times.departAt : undefined} value={times.returnAt} onChange={(value) => setTimes((current) => ({ ...current, returnAt: value }))} /></div>}
                  <label className="text-sm font-semibold text-slate-700">Điểm đón<input maxLength={300} value={route.pickup} onChange={(event) => setRoute({ ...route, pickup: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                  <label className="text-sm font-semibold text-slate-700">Điểm đến<input maxLength={300} value={route.destination} onChange={(event) => setRoute({ ...route, destination: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                </div>
                {/* Always shown; required (and highlighted) once the time or route differs from the request. */}
                <div className={`mt-3 rounded-xl p-3 ring-1 ${requestChanges.length ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-200"}`}>
                  {requestChanges.length > 0 && <>
                    <p className="text-sm font-semibold text-amber-900">Bạn đang đổi so với yêu cầu của người đặt:</p>
                    <ul className="mb-3 mt-1 list-disc pl-5 text-sm text-amber-900">{requestChanges.map((item) => <li key={item}>{item}</li>)}</ul>
                  </>}
                  <label htmlFor="vehicle-change-reason" className="block text-sm font-semibold text-slate-700">{requestChanges.length ? "Lý do thay đổi" : "Lý do thay đổi / lời nhắn cho người đặt"}{requestChanges.length > 0 && <span className="text-rose-500"> *</span>}</label>
                  <textarea id="vehicle-change-reason" rows={2} maxLength={300} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Ví dụ: 15:30 mới có xe công ty, xe ngoài hết chuyến…" className={`${INPUT} mt-1.5`} />
                  <p className={`mt-1 text-xs ${requestChanges.length ? "text-amber-800" : "text-slate-500"}`}>
                    {requestChanges.length ? "Bắt buộc. Người đặt sẽ nhận lý do này qua thông báo trên web và email." : "Bắt buộc khi đổi giờ đi, giờ về, điểm đón hoặc điểm đến. Không đổi gì mà vẫn ghi thì gửi như lời nhắn. Người đặt nhận qua thông báo và email."}
                  </p>
                </div>
              </details>
              <div className="mt-4 flex justify-end">
                <button type="button" disabled={Boolean(busy)} onClick={() => void save()} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{busy === "save" ? "Đang lưu…" : trip.status === "pending" ? "Sắp xếp xe" : "Lưu thay đổi"}</button>
              </div>
            </Section>
          ) : (
            <Section title="Kết quả">
              <dl className="grid gap-3 sm:grid-cols-3">
                <Info label="Loại xe">{trip.vehicleType ? VEHICLE_TYPE_LABELS[trip.vehicleType] : "—"}</Info>
                {trip.vehicleType === "external" ? <>
                  <Info label="Giá dự kiến">{formatVnd(trip.estimatedCost)}</Info>
                  <Info label="Giá thật">{formatVnd(trip.actualCost)}</Info>
                </> : <Info label="Tài xế">{[trip.driverName, trip.driverPlate, trip.driverPhone].filter(Boolean).join(" · ")}</Info>}
                {trip.status === "completed" && <Info label="Hoàn thành thật">{formatTripTime(trip.actualEndAt)}<span className="block text-xs font-normal text-slate-500">Dự kiến: {formatTripTime(trip.expectedEndAt)}</span></Info>}
                {trip.completedBy && <Info label="Chốt bởi">{trip.completedBy.name} · {formatTripTime(trip.completedAt)}</Info>}
                {trip.cancel && <Info label={trip.cancel.byRequester ? "Người đặt hủy" : `Hủy bởi ${trip.cancel.byName}`}>{trip.cancel.reason}</Info>}
              </dl>
            </Section>
          )}

          {(trip.status === "arranged" || trip.status === "arrived") && (
            <Section title="Chốt chuyến">
              {trip.status === "arrived" && <p className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">Người đặt đã báo đi xong lúc {formatTripTime(trip.arrivedAt)}.</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="text-sm font-semibold text-slate-700">
                  <p className="mb-1.5">Thời gian hoàn thành thật <span className="text-rose-500">*</span></p>
                  <DateTimeInput dateLabel="Ngày hoàn thành thật" timeLabel="Giờ hoàn thành thật" min={toLocalInput(trip.departAt)} value={actualEndAt} onChange={setActualEndAt} />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Dự kiến: {formatTripTime(trip.expectedEndAt)}. Ghi giờ chuyến xe thực sự kết thúc.</span>
                </div>
                {trip.vehicleType === "external" && (
                  <label className="block text-sm font-semibold text-slate-700">Giá thật (VND) <span className="text-rose-500">*</span>
                    <input inputMode="numeric" value={actualCost} onChange={(event) => setActualCost(event.target.value.replace(/[^\d]/g, ""))} className={`${INPUT} mt-1.5`} />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Dự kiến: {formatVnd(trip.estimatedCost)}</span>
                  </label>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {files.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700">
                    <span className="max-w-40 truncate">{file.name}</span>
                    <button type="button" aria-label={`Bỏ ảnh ${file.name}`} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}><X aria-hidden="true" size={13} /></button>
                  </span>
                ))}
                {files.length < MAX_FILES && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                    <ImagePlus aria-hidden="true" size={15} />Thêm ảnh hóa đơn (không bắt buộc)
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pick} />
                  </label>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" disabled={Boolean(busy)} onClick={() => void complete()} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{busy === "complete" ? "Đang chốt…" : "Chốt hoàn thành"}</button>
              </div>
            </Section>
          )}

          {open && (
            <Section title="Hủy chuyến">
              <textarea rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do hủy (bắt buộc, người đặt sẽ thấy)" className={INPUT} />
              <div className="mt-3 flex justify-end">
                <button type="button" disabled={Boolean(busy)} onClick={() => void cancel()} className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60">{busy === "cancel" ? "Đang hủy…" : "Hủy chuyến"}</button>
              </div>
            </Section>
          )}

          {trip.status === "cancelled" && canDelete && (
            <div className="flex justify-end">
              <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"><Trash2 aria-hidden="true" size={15} />Xóa hẳn chuyến đã hủy</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
