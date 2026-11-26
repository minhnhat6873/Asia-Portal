"use client";

import { CarFront, ImagePlus, Pencil, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImageLightbox from "@/components/ui/ImageLightbox";
import UnsavedChangesDialog from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import DateTimeInput, { isCompleteDateTime } from "@/components/ui/DateTimeInput";
import { ApiError } from "@/services/api";

/** Hoàn thành dự kiến cách giờ đi tối đa (giống VEHICLE_MAX_EXPECTED_END_DAYS ở backend). */
const EXPECTED_END_MAX_DAYS = 90;
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
  REQUESTER_GONE,
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

function MoneyInput({ value, onChange, placeholder, id }: { value: string; onChange: (value: string) => void; placeholder?: string; id?: string }) {
  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return <input id={id} type="text" inputMode="numeric" value={formatted} placeholder={placeholder} className={`${INPUT} mt-1.5`} onKeyDown={(event) => {
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    if (start !== input.selectionEnd) return;
    if (event.key === "Backspace" && input.value[start - 1] === ".") input.setSelectionRange(start - 2, start);
    if (event.key === "Delete" && input.value[start] === ".") input.setSelectionRange(start, start + 2);
  }} onChange={(event) => {
    const input = event.currentTarget;
    const digitsBeforeCursor = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length;
    const digits = input.value.replace(/\D/g, "");
    onChange(digits);
    requestAnimationFrame(() => {
      if (!input.isConnected) return;
      let cursor = 0, seen = 0;
      while (cursor < input.value.length && seen < digitsBeforeCursor) {
        if (/\d/.test(input.value[cursor])) seen++;
        cursor++;
      }
      input.setSelectionRange(cursor, cursor);
    });
  }} />;
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[140px_minmax(0,1fr)]"><dt className="text-sm leading-5 text-slate-600">{label}</dt><dd className="min-w-0 break-words text-sm font-semibold leading-5 text-slate-900">{children || "—"}</dd></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-t border-slate-100 pt-4"><h3 className="mb-3 text-sm font-bold text-emerald-800">{title}</h3>{children}</section>;
}

function ReceiptPreview({ file, disabled, onRemove }: { file: File; disabled: boolean; onRemove: () => void }) {
  const image = useRef<HTMLImageElement>(null);
  const url = useRef("");
  const [viewingImage, setViewingImage] = useState<{ src: string; name: string } | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    url.current = objectUrl;
    if (image.current) image.current.src = objectUrl;
    return () => { URL.revokeObjectURL(objectUrl); url.current = ""; };
  }, [file]);

  return (
    <div className="relative w-28 shrink-0 rounded-xl border border-slate-200 bg-white">
      <button type="button" aria-label={`Xem ảnh ${file.name}`} onClick={() => { if (url.current) setViewingImage({ src: url.current, name: file.name }); }} className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600">
        {/* Local image previews use browser object URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={image} alt={`Ảnh hóa đơn: ${file.name}`} className="h-full w-full object-cover" />
      </button>
      <button type="button" disabled={disabled} aria-label={`Bỏ ảnh ${file.name}`} onClick={onRemove} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"><X aria-hidden="true" size={14} /></button>
      <p title={file.name} className="truncate px-2 py-1.5 text-[11px] font-semibold text-slate-700">{file.name}</p>
      <ImageLightbox image={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}

function TripImageGroup({ title, images }: { title: string; images: VehicleTrip["receipts"] }) {
  const [viewingImage, setViewingImage] = useState<{ src: string; name: string } | null>(null);
  return (
    <section className="rounded-xl border border-slate-200 p-3">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {images.length ? <>
        <p className="mt-1 text-xs text-slate-500">{images.length} ảnh · Bấm vào ảnh để xem lớn</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <div key={`${image.url}-${index}`} className="min-w-0">
              <button type="button" aria-label={`Xem ${title.toLowerCase()} ${index + 1}`} onClick={() => setViewingImage({ src: image.url, name: `${title} ${index + 1}` })} className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                {/* eslint-disable-next-line @next/next/no-img-element -- Uploaded trip pictures */}
                <img src={image.url} alt={`${title} ${index + 1}`} className="h-full w-full object-contain" />
              </button>
              {image.at && <p className="mt-1 text-xs text-slate-500">{formatTripTime(image.at)}</p>}
            </div>
          ))}
        </div>
      </> : <p className="mt-2 text-sm text-slate-500">Chưa có ảnh.</p>}
      <ImageLightbox image={viewingImage} onClose={() => setViewingImage(null)} />
    </section>
  );
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
  const [times, setTimes] = useState({ departAt: toLocalInput(trip.departAt), returnAt: toLocalInput(trip.returnAt), expectedEndAt: toLocalInput(trip.expectedEndAt ?? (trip.roundTrip ? trip.returnAt : null)) });
  const [route, setRoute] = useState({ pickup: trip.pickup, destination: trip.destination });
  // Why HR changes the requested time or route; sent to the requester (web and email).
  const [changeReason, setChangeReason] = useState("");
  // HR opened "Sửa thời gian và lộ trình": something must then differ from the request (with a
  // reason), or HR cancels the edit, which puts everything back as the requester asked.
  const [editingRoute, setEditingRoute] = useState(false);
  const requested = { departAt: toLocalInput(trip.departAt), returnAt: toLocalInput(trip.returnAt), pickup: trip.pickup, destination: trip.destination };
  // What HR changed compared with the request: the old value is shown struck through.
  const requestChanges = [
    times.departAt !== requested.departAt && { label: "Giờ đi", from: formatTripTime(trip.departAt), to: times.departAt ? formatLocal(times.departAt) : "—" },
    trip.roundTrip && times.returnAt !== requested.returnAt && { label: "Giờ về", from: formatTripTime(trip.returnAt), to: times.returnAt ? formatLocal(times.returnAt) : "—" },
    route.pickup.trim() !== requested.pickup.trim() && { label: "Điểm đón", from: trip.pickup, to: route.pickup.trim() || "—" },
    route.destination.trim() !== requested.destination.trim() && { label: "Điểm đến", from: trip.destination, to: route.destination.trim() || "—" },
  ].filter((item): item is { label: string; from: string; to: string } => Boolean(item));
  /** The requested value, struck through with the new one under it when HR changed it. */
  const requestValue = (label: string, value: ReactNode) => {
    const change = requestChanges.find((item) => item.label === label);
    if (!change) return value;
    return <><s className="text-slate-400 decoration-rose-500 decoration-2">{value}</s><span className="mt-0.5 block font-semibold text-amber-700">→ {change.to}</span></>;
  };
  const cancelRouteEdit = () => {
    setTimes((current) => ({ ...current, departAt: requested.departAt, returnAt: requested.returnAt }));
    setRoute({ pickup: trip.pickup, destination: trip.destination });
    setChangeReason("");
    setEditingRoute(false);
  };
  const [actualCost, setActualCost] = useState(trip.actualCost ? String(trip.actualCost) : trip.estimatedCost ? String(trip.estimatedCost) : "");
  // Giờ hoàn thành thật: mặc định đúng bằng giờ hoàn thành dự kiến; HR sửa nếu khác rồi mới chốt.
  // Chưa có giờ dự kiến thì lấy giờ người đặt báo "Đã đi xong", cuối cùng là bây giờ.
  const [actualEndAt, setActualEndAt] = useState(() => {
    if (trip.actualEndAt) return toLocalInput(trip.actualEndAt);
    if (trip.expectedEndAt) return toLocalInput(trip.expectedEndAt);
    if (trip.arrivedAt) return toLocalInput(trip.arrivedAt);
    return toLocalInput(new Date().toISOString());
  });
  const [files, setFiles] = useState<File[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "complete" | "cancel" | "delete">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const vehicleValues = JSON.stringify({ vehicleType, estimatedCost, driver, expectedEndAt: times.expectedEndAt });
  const routeValues = JSON.stringify({ departAt: times.departAt, returnAt: times.returnAt, route, changeReason });
  const [initialVehicle, setInitialVehicle] = useState(vehicleValues);
  const [initialRoute, setInitialRoute] = useState(routeValues);
  const vehicleDirty = vehicleValues !== initialVehicle;
  const routeDirty = routeValues !== initialRoute;
  const [initialCompletion] = useState(() => JSON.stringify({ actualCost, actualEndAt }));
  const completionDirty = JSON.stringify({ actualCost, actualEndAt }) !== initialCompletion || files.length > 0;
  const dirty = vehicleDirty || routeDirty || completionDirty || Boolean(reason.trim());
  const navigation = useUnsavedChanges(dirty, Boolean(busy));
  const requestClose = () => navigation.requestLeave(onClose);

  const focusInvalid = (selector: string) => {
    navigation.cancelNavigation();
    const target = document.querySelector<HTMLElement>(selector);
    if (target?.closest("#vehicle-route-edit")) setEditingRoute(true);
    requestAnimationFrame(() => { target?.scrollIntoView({ block: "center", behavior: "smooth" }); (target?.querySelector<HTMLElement>("input, button, select, textarea") ?? target)?.focus(); });
  };
  const save = async (scope: "vehicle" | "route" | "all", leaveAfterSave = false) => {
    const saveVehicle = scope === "vehicle" || (scope === "all" && vehicleDirty);
    const saveRoute = scope === "route" || (scope === "all" && routeDirty);
    if (leaveAfterSave && completionDirty) { navigation.cancelNavigation(); toast.error("Vui lòng hoàn thành chuyến hoặc bỏ thay đổi chốt chuyến trước khi rời."); return; }
    if (saveVehicle && !saveRoute && trip.status === "pending" && routeDirty) { toast.error("Vui lòng lưu thời gian và lộ trình hoặc hủy chỉnh sửa trước khi sắp xếp xe."); return; }
    if (saveVehicle && !vehicleType) { focusInvalid("input[name=vehicle-type]"); toast.error("Vui lòng chọn xe công ty hoặc xe ngoài."); return; }
    if (saveVehicle && !isCompleteDateTime(times.expectedEndAt)) { focusInvalid("#vehicle-expected-end"); toast.error("Vui lòng chọn đủ ngày và giờ hoàn thành dự kiến."); return; }
    if (saveRoute && !isCompleteDateTime(times.departAt)) { focusInvalid("#vehicle-admin-depart"); toast.error("Vui lòng chọn đủ ngày và giờ đi."); return; }
    if (saveRoute && trip.roundTrip && !isCompleteDateTime(times.returnAt)) { focusInvalid("#vehicle-admin-return"); toast.error("Vui lòng chọn đủ ngày và giờ về."); return; }
    const expectedEndAt = saveVehicle ? times.expectedEndAt : toLocalInput(trip.expectedEndAt);
    const departAt = saveRoute ? times.departAt : toLocalInput(trip.departAt);
    if (expectedEndAt) {
      // Giờ nhập là giờ Việt Nam (UTC+7). Hoàn thành dự kiến: sau giờ đi, tối đa 90 ngày (giống server).
      const gap = new Date(`${expectedEndAt}:00+07:00`).getTime() - new Date(`${departAt}:00+07:00`).getTime();
      if (gap <= 0) { focusInvalid("#vehicle-expected-end"); toast.error("Thời gian hoàn thành dự kiến phải sau giờ đi."); return; }
      if (gap > EXPECTED_END_MAX_DAYS * 24 * 60 * 60_000) { focusInvalid("#vehicle-expected-end"); toast.error(`Thời gian hoàn thành dự kiến cách giờ đi tối đa ${EXPECTED_END_MAX_DAYS} ngày.`); return; }
    }
    const message = changeReason.trim();
    if (saveRoute && !requestChanges.length) { toast.error("Giờ và lộ trình đang giống yêu cầu của người đặt. Hãy sửa lại, hoặc bấm \"Hủy chỉnh sửa\"."); focusInvalid("#vehicle-admin-depart"); return; }
    if (saveRoute && requestChanges.length && message.length < 3) { toast.error("Bạn đã đổi giờ hoặc lộ trình. Vui lòng nhập lý do thay đổi (ít nhất 3 ký tự) để báo cho người đặt."); focusInvalid("#vehicle-change-reason"); return; }
    // Only changed trip fields are sent (a changed time restarts its reminders on the server).
    const input: VehicleArrangeInput = {};
    // The reason goes with a change of time or route (only possible while editing them).
    if (saveRoute && requestChanges.length) input.changeReason = message;
    const original = { departAt: toLocalInput(trip.departAt), returnAt: toLocalInput(trip.returnAt), expectedEndAt: toLocalInput(trip.expectedEndAt), pickup: trip.pickup, destination: trip.destination };
    const edited = { ...times, ...route };
    for (const key of Object.keys(edited) as (keyof typeof edited)[]) {
      if (key === "expectedEndAt" ? !saveVehicle : !saveRoute) continue;
      if (edited[key] !== original[key]) Object.assign(input, { [key]: key === "returnAt" ? edited.returnAt || null : edited[key] });
    }
    if (saveVehicle && vehicleType) input.vehicleType = vehicleType;
    if (saveVehicle && vehicleType === "external") {
      const cost = money(estimatedCost);
      if (!cost) { focusInvalid("#vehicle-estimated-cost"); toast.error("Xe ngoài cần nhập giá dự kiến."); return; }
      input.estimatedCost = cost;
    }
    if (saveVehicle && vehicleType === "company") Object.assign(input, driver);
    if (!saveVehicle && !saveRoute) { if (leaveAfterSave) await navigation.leave(); return; }
    setBusy("save");
    try {
      onChanged(await arrangeVehicleTrip(trip.id, input));
      if (saveVehicle) setInitialVehicle(vehicleValues);
      if (saveRoute) {
        setInitialRoute(JSON.stringify({ departAt: times.departAt, returnAt: times.returnAt, route, changeReason: "" }));
        setChangeReason("");
        setEditingRoute(false);
      }
      if (leaveAfterSave) await navigation.leave();
      toast.success(input.changeReason
        ? "Đã lưu. Người đặt đã nhận thông báo và email kèm lý do thay đổi."
        : trip.status === "pending" && saveVehicle ? "Đã sắp xếp xe. Người đặt đã được báo." : "Đã lưu thông tin xe. Người đặt đã được báo.");
      // Show what was just sent (the list sits higher up in the dialog).
      if (input.changeReason) window.setTimeout(() => document.getElementById("vehicle-change-history")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch (error) { if (leaveAfterSave) navigation.cancelNavigation(); toast.error(errorText(error, "Không lưu được chuyến xe.")); } finally { setBusy(""); }
  };

  const complete = async () => {
    if (vehicleDirty || routeDirty) { toast.error("Vui lòng lưu thông tin xe, thời gian và lộ trình hoặc bỏ chỉnh sửa trước khi chốt chuyến."); return; }
    const cost = money(actualCost);
    if (!isCompleteDateTime(actualEndAt)) { toast.error("Vui lòng chọn đủ ngày và giờ hoàn thành thật."); return; }
    if (actualEndAt <= toLocalInput(trip.departAt)) { toast.error("Thời gian hoàn thành thật phải sau giờ đi."); return; }
    if (new Date(`${actualEndAt}:00+07:00`).getTime() - new Date(trip.departAt).getTime() > EXPECTED_END_MAX_DAYS * 24 * 60 * 60_000) { toast.error(`Thời gian hoàn thành thật cách giờ đi tối đa ${EXPECTED_END_MAX_DAYS} ngày.`); return; }
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
      setShowCancel(false);
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
    <div role="dialog" aria-modal="true" aria-labelledby="vehicle-trip-title" className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) requestClose(); }}>
      <UnsavedChangesDialog open={navigation.isPromptOpen} saving={Boolean(busy)} description="Bạn muốn lưu tất cả thay đổi thông tin xe, thời gian và lộ trình trước khi rời?" onContinue={navigation.cancelNavigation} onDiscard={() => void navigation.leave()} onSave={() => { navigation.hidePrompt(); requestAnimationFrame(() => void save("all", true)); }} />
      <ConfirmDialog open={confirmDelete} title="Xóa vĩnh viễn chuyến xe này?" description={`Chuyến ${trip.status === "cancelled" ? "đã hủy" : "đang xử lý"} sẽ bị xóa khỏi hệ thống cùng ảnh đính kèm và mọi thông báo liên quan. Người đặt không nhận thông báo nào, chuyến cũng biến mất khỏi trang của họ. Không thể hoàn tác.`} cancelLabel="Giữ lại" confirmLabel="Xóa chuyến" onCancel={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
      <div className="w-full max-w-[1600px] rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 id="vehicle-trip-title" className="text-lg font-extrabold text-slate-900">Chi tiết chuyến xe</h2>
            <p className="mt-1 text-xs text-slate-500">Thông tin yêu cầu, kết quả và hình ảnh chuyến xe</p>
          </div>
          <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[trip.status]}`}>{VEHICLE_STATUS_LABELS[trip.status]}</span><button type="button" aria-label="Đóng" disabled={Boolean(busy)} onClick={requestClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X aria-hidden="true" size={18} /></button></div>
        </header>

        <fieldset disabled={Boolean(busy)} className="grid min-w-0 gap-6 border-t border-slate-200 p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 space-y-4 md:border-r md:border-slate-200 md:pr-6">
          <Section title="Thông tin yêu cầu">
            <dl className="grid gap-3">
              <Info label="Người đặt">{trip.requester.name}<span className="block text-xs font-normal text-slate-500">{trip.requester.department || "—"} · {trip.requester.email}</span>{trip.requesterStatus && trip.requesterStatus !== "active" && <span role="note" className="mt-1 inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">{REQUESTER_GONE[trip.requesterStatus]}</span>}</Info>
              {/* When the request was sent (not when the car leaves). */}
              <Info label="Thời gian đặt">{formatTripTime(trip.createdAt)}</Info>
              {trip.forOther && <Info label="Đặt giúp cho">{trip.forOtherName}<a href={`tel:${trip.forOtherPhone.replace(/\s/g, "")}`} className="block text-xs font-semibold text-emerald-700">{trip.forOtherPhone}</a></Info>}
              <Info label="Mục đích">{VEHICLE_PURPOSE_LABELS[trip.purpose]}</Info>
              <Info label="Khách / Hàng">{trip.customerName}</Info>
              <Info label="Trạng thái"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[trip.status]}`}>{VEHICLE_STATUS_LABELS[trip.status]}</span>{trip.status === "arrived" && <span className="mt-1 block text-xs font-normal text-slate-500">Người đặt đã báo đi xong</span>}</Info>
              <Info label="Giờ đi">{requestValue("Giờ đi", formatTripTime(trip.departAt))}</Info>
              {trip.roundTrip && <Info label="Giờ về">{requestValue("Giờ về", formatTripTime(trip.returnAt))}</Info>}
              <Info label="Hoàn thành dự kiến">{formatTripTime(trip.expectedEndAt ?? (trip.roundTrip ? trip.returnAt : null))}</Info>
              <Info label="Điểm đón">{requestValue("Điểm đón", trip.pickup)}{trip.pickupLocation && <a href={mapLink(trip.pickupLocation)} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs font-semibold text-emerald-700 underline">Xem điểm đón trên bản đồ{trip.pickupLocation.accuracy ? ` (±${trip.pickupLocation.accuracy} m)` : ""}</a>}</Info>
              <Info label="Điểm đến">{requestValue("Điểm đến", trip.destination)}</Info>
              {(trip.extraDestinations ?? []).map((destination, index) => <Info key={index} label={`Điểm đến ${index + 2}`}>{destination}</Info>)}
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
                    {change.items.map((item) => <p key={item.label}><strong>{item.label}:</strong> <s className="text-amber-800/60 decoration-rose-500 decoration-2">{item.from}</s> → <strong>{item.to}</strong></p>)}
                    <p className={change.items.length ? "mt-1" : ""}><strong>{change.items.length ? "Lý do:" : "Lời nhắn:"}</strong> {change.reason}</p>
                    <p className="mt-1 text-xs text-amber-800">{change.byName} · {formatTripTime(change.at)} · đã báo người đặt</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          </div>
          <div className="min-w-0 space-y-4 xl:border-r xl:border-slate-200 xl:pr-6">
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
                  <MoneyInput id="vehicle-estimated-cost" value={estimatedCost} onChange={setEstimatedCost} placeholder="Ví dụ: 150.000" />
                </label>
              )}
              {vehicleType === "company" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm font-semibold text-slate-700">Tài xế<input maxLength={100} value={driver.driverName} onChange={(event) => setDriver({ ...driver, driverName: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                  <label className="text-sm font-semibold text-slate-700">Biển số<input maxLength={20} value={driver.driverPlate} onChange={(event) => setDriver({ ...driver, driverPlate: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                  <label className="text-sm font-semibold text-slate-700">SĐT tài xế<input type="tel" maxLength={20} value={driver.driverPhone} onChange={(event) => setDriver({ ...driver, driverPhone: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                </div>
              )}
              <div className="mt-3 min-[1061px]:w-2/3">
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Hoàn thành dự kiến <span className="text-rose-500">*</span></p>
                <DateTimeInput id="vehicle-expected-end" dateLabel="Ngày hoàn thành dự kiến" timeLabel="Giờ hoàn thành dự kiến" min={isCompleteDateTime(times.departAt) ? times.departAt : undefined} value={times.expectedEndAt} onChange={(value) => setTimes((current) => ({ ...current, expectedEndAt: value }))} />
                <p className="mt-1 text-xs text-slate-500">Sau giờ đi, tối đa {EXPECTED_END_MAX_DAYS} ngày. Quá giờ này mà chưa chốt chuyến, HR sẽ được nhắc.</p>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" disabled={Boolean(busy) || (!vehicleDirty && trip.status !== "pending")} onClick={() => void save("vehicle")} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busy === "save" ? "Đang lưu…" : trip.status === "pending" ? "Sắp xếp xe" : "Lưu thông tin xe"}</button>
              </div>
              <div id="vehicle-route-edit" className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">Thời gian và lộ trình</p>
                  {editingRoute
                    ? <button type="button" disabled={Boolean(busy)} onClick={cancelRouteEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Undo2 aria-hidden="true" size={15} />Hủy chỉnh sửa</button>
                    : <button type="button" disabled={Boolean(busy)} onClick={() => setEditingRoute(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><Pencil aria-hidden="true" size={15} />Sửa thời gian và lộ trình</button>}
                </div>
                {!editingRoute && <p className="mt-1 text-xs text-slate-500">Giữ đúng giờ và lộ trình người đặt yêu cầu. Chỉ sửa khi không đáp ứng được; khi sửa phải ghi lý do để báo người đặt.</p>}
                {editingRoute && <>
                <div className="mt-3 grid min-w-0 gap-3 min-[1061px]:grid-cols-2">
                  <div className="text-sm font-semibold text-slate-700"><p className="mb-1.5">Ngày và giờ đi</p><DateTimeInput id="vehicle-admin-depart" dateLabel="Ngày đi" timeLabel="Giờ đi" value={times.departAt} onChange={(value) => setTimes((current) => ({ ...current, departAt: value }))} /></div>
                  {trip.roundTrip && <div className="text-sm font-semibold text-slate-700"><p className="mb-1.5">Ngày và giờ về</p><DateTimeInput id="vehicle-admin-return" dateLabel="Ngày về" timeLabel="Giờ về" min={isCompleteDateTime(times.departAt) ? times.departAt : undefined} value={times.returnAt} onChange={(value) => setTimes((current) => ({ ...current, returnAt: value }))} /></div>}
                  <label className="text-sm font-semibold text-slate-700">Điểm đón<input maxLength={300} value={route.pickup} onChange={(event) => setRoute({ ...route, pickup: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                  <label className="text-sm font-semibold text-slate-700">Điểm đến<input maxLength={300} value={route.destination} onChange={(event) => setRoute({ ...route, destination: event.target.value })} className={`${INPUT} mt-1.5`} /></label>
                </div>
                {/* Something must differ from the request; otherwise HR cancels the edit. */}
                <div className={`mt-3 rounded-xl p-3 ring-1 ${requestChanges.length ? "bg-amber-50 ring-amber-200" : "bg-rose-50 ring-rose-200"}`}>
                  {requestChanges.length > 0
                    ? <>
                      <p className="text-sm font-semibold text-amber-900">Bạn đang đổi so với yêu cầu của người đặt:</p>
                      <ul className="mb-3 mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">{requestChanges.map((item) => <li key={item.label}>{item.label}: <s className="text-amber-700/70 decoration-rose-500 decoration-2">{item.from}</s> → <strong>{item.to}</strong></li>)}</ul>
                    </>
                    : <p role="status" className="mb-3 text-sm font-semibold text-rose-700">Giờ và lộ trình đang giống yêu cầu của người đặt, chưa có gì thay đổi. Hãy sửa lại, hoặc bấm &quot;Hủy chỉnh sửa&quot;.</p>}
                  <label htmlFor="vehicle-change-reason" className="block text-sm font-semibold text-slate-700">Lý do thay đổi<span className="text-rose-500"> *</span></label>
                  <textarea id="vehicle-change-reason" rows={2} maxLength={300} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Ví dụ: 15:30 mới có xe công ty, xe ngoài hết chuyến…" className={`${INPUT} mt-1.5`} />
                  <p className={`mt-1 text-xs ${requestChanges.length ? "text-amber-800" : "text-slate-500"}`}>Bắt buộc. Người đặt sẽ nhận lý do này qua thông báo trên web và email.</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" disabled={Boolean(busy) || !requestChanges.length} onClick={() => void save("route")} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busy === "save" ? "Đang lưu…" : "Lưu thời gian và lộ trình"}</button>
                </div>
                </>}
              </div>

            </Section>
          ) : (
            <Section title="Kết quả">
              <dl className="grid gap-3">
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
                  <span className="mt-1 block text-xs font-normal text-slate-500">Mặc định bằng giờ dự kiến.</span>
                </div>
                {trip.vehicleType === "external" && (
                  <label className="block text-sm font-semibold text-slate-700">Giá thật (VND) <span className="text-rose-500">*</span>
                    <MoneyInput value={actualCost} onChange={setActualCost} />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Dự kiến: {formatVnd(trip.estimatedCost)}</span>
                  </label>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {files.map((file, index) => (
                  <ReceiptPreview key={`${file.name}-${index}`} file={file} disabled={Boolean(busy)} onRemove={() => setFiles((current) => current.filter((_, position) => position !== index))} />
                ))}
                {files.length < MAX_FILES && (
                  <label className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-white px-5 py-3 text-xs font-bold text-emerald-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 ${files.length ? "w-auto" : "w-full"} ${busy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-emerald-50"}`}>
                    <ImagePlus aria-hidden="true" size={16} />{files.length ? "Thêm ảnh khác" : "Thêm ảnh hóa đơn (không bắt buộc)"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={Boolean(busy)} className="sr-only" onChange={pick} />
                  </label>
                )}
              </div>

            </Section>
          )}

          </div>
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <Section title="Hình ảnh chuyến xe">
              <div className="space-y-4">
                <TripImageGroup title="Ảnh ban đầu (người đặt gửi)" images={trip.attachments ?? []} />
                <TripImageGroup title="Ảnh hoàn thành chuyến (người đặt gửi)" images={(trip.receipts ?? []).filter((image) => image.uploadedBy === "requester")} />
                <TripImageGroup title="Ảnh HR xác nhận" images={(trip.receipts ?? []).filter((image) => image.uploadedBy === "hr")} />
              </div>
            </Section>
          </div>
        </fieldset>
        {showCancel && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="cancel-trip-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h3 id="cancel-trip-title" className="text-lg font-bold text-slate-900">Hủy chuyến xe?</h3><p className="mt-2 text-sm text-slate-500">Nhập lý do để người đặt biết vì sao chuyến bị hủy.</p><label className="mt-4 block text-sm font-semibold text-slate-700">Lý do hủy<textarea autoFocus rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do hủy chuyến..." className={`${INPUT} mt-1.5`} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => setShowCancel(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Quay lại</button><button type="button" disabled={Boolean(busy)} onClick={() => void cancel()} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-60">{busy === "cancel" ? "Đang hủy…" : "Xác nhận hủy"}</button></div></div></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          {open && <button type="button" disabled={Boolean(busy)} onClick={() => setShowCancel(true)} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-60">Hủy chuyến</button>}
          {/* Completed trips stay for the cost reports. */}
          {trip.status !== "completed" && canDelete && (
            <div className="flex justify-end">
              <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"><Trash2 aria-hidden="true" size={15} />Xóa vĩnh viễn</button>
            </div>
          )}
          <div className="ml-auto flex flex-wrap justify-end gap-2"><button type="button" disabled={Boolean(busy)} onClick={requestClose} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Đóng</button>{(trip.status === "arranged" || trip.status === "arrived") && <button type="button" disabled={Boolean(busy)} onClick={() => void complete()} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{busy === "complete" ? "Đang chốt…" : "Chốt hoàn thành"}</button>}</div>
        </div>
      </div>
    </div>
  );
}
