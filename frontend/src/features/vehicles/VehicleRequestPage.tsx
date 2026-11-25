"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CarFront, ChevronRight, CircleDot, Flag, LocateFixed, MapPinned, Package, Send, UserRound, UserRoundPlus, Users, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiError } from "@/services/api";
import { useUserSession } from "@/lib/userSession";
import { showToast } from "@/features/admin/auth/notify";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import PlaceInput from "./PlaceInput";
import DateTimeInput, { isCompleteDateTime } from "@/components/ui/DateTimeInput";
import { validateVehicleRequest, vietnamLocal, VEHICLE_MIN_LEAD_MINUTES, type VehicleRequestErrors as Errors } from "@/lib/vehicleValidation";
import {
  getMyTrips,
  mapLink,
  requestVehicle,
  toLocalInput,
  updateMyTrip,
  type VehiclePurpose,
  type VehicleRequestInput,
} from "@/services/vehicle.service";

type Field = keyof VehicleRequestInput;

const EMPTY: VehicleRequestInput = {
  forOther: false, forOtherName: "", forOtherPhone: "",
  purpose: "guest", customerName: "", customerPhone: "", passengerCount: 1, goodsDescription: "", goodsQuantity: "",
  senderName: "", senderPhone: "", receiverName: "", receiverPhone: "",
  pickup: "", pickupLocation: null, destination: "", departAt: "", roundTrip: false, returnAt: null, note: "",
};
/** Current Vietnam time plus some minutes, as "YYYY-MM-DDTHH:mm". */
const localFromNow = (minutes: number) => vietnamLocal(Date.now() + minutes * 60_000);

const INPUT = "w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 [&:not(textarea)]:h-12";
const tone = (error?: string) => (error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20");

function Field({ id, label, required, error, hint, children, className }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</label>
      {children}
      {error ? <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function VehicleRequestPage() {
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const account = useUserSession().account;
  // Values and errors live in one state so each update sees the latest of both. Several
  // fields can change in one event (picking a suggestion fills the text and the
  // coordinates, then re-checks), and each step must build on the previous one.
  const [form, setForm] = useState<{ values: VehicleRequestInput; errors: Errors }>({ values: EMPTY, errors: {} });
  const { values, errors } = form;
  const setValues = (update: VehicleRequestInput | ((current: VehicleRequestInput) => VehicleRequestInput)) =>
    setForm((current) => ({ ...current, values: typeof update === "function" ? update(current.values) : update }));
  const setErrors = (update: Errors | ((current: Errors) => Errors)) =>
    setForm((current) => ({ ...current, errors: typeof update === "function" ? update(current.errors) : update }));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Pickup = where the person is now. Browsers only allow this on HTTPS (or localhost)
  // and always ask permission; the typed pickup text stays as a fallback.
  const useCurrentLocation = () => {
    setLocationError("");
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      setLocationError("Trình duyệt chỉ cho lấy vị trí khi trang dùng HTTPS. Vui lòng nhập điểm đón bằng tay.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const location = { lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)), accuracy: Math.round(position.coords.accuracy) };
      setValues((current) => ({ ...current, pickupLocation: location, pickup: current.pickup.trim() ? current.pickup : `${location.lat}, ${location.lng}` }));
      setErrors((current) => ({ ...current, pickup: undefined }));
      setLocating(false);
    }, (failure) => {
      setLocating(false);
      setLocationError(failure.code === failure.PERMISSION_DENIED
        ? "Bạn đã chặn quyền vị trí. Hãy bật lại trong cài đặt trình duyệt (biểu tượng ổ khóa cạnh địa chỉ trang), hoặc nhập điểm đón bằng tay."
        : failure.code === failure.TIMEOUT ? "Lấy vị trí quá lâu. Vui lòng thử lại hoặc nhập bằng tay." : "Không lấy được vị trí. Hãy kiểm tra máy đã bật dịch vụ vị trí chưa, hoặc nhập bằng tay.");
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 });
  };

  useEffect(() => {
    if (!editId) return;
    const controller = new AbortController();
    getMyTrips(controller.signal).then((trips) => {
      const trip = trips.find((item) => item.id === editId);
      if (!trip || trip.status !== "pending") { setLoadError("Chỉ sửa được yêu cầu đang chờ HR xử lý."); return; }
      setValues({
        forOther: trip.forOther, forOtherName: trip.forOtherName, forOtherPhone: trip.forOtherPhone,
        purpose: trip.purpose, customerName: trip.customerName, customerPhone: trip.customerPhone, passengerCount: trip.passengerCount ?? 1,
        goodsDescription: trip.goodsDescription, goodsQuantity: trip.goodsQuantity, senderName: trip.senderName, senderPhone: trip.senderPhone,
        receiverName: trip.receiverName, receiverPhone: trip.receiverPhone, pickup: trip.pickup, pickupLocation: trip.pickupLocation, destination: trip.destination, departAt: toLocalInput(trip.departAt),
        roundTrip: trip.roundTrip, returnAt: trip.returnAt ? toLocalInput(trip.returnAt) : null, note: trip.note,
      });
    }).catch((reason) => { if (!controller.signal.aborted) setLoadError(reason instanceof Error ? reason.message : "Không tải được yêu cầu."); });
    return () => controller.abort();
  }, [editId]);

  // Errors already shown are re-checked on every change, so they update or disappear as
  // the person types (and related ones too: e.g. the return time after changing the
  // departure). New errors appear when leaving a field or on submit.
  const set = <K extends Field>(field: K, value: VehicleRequestInput[K]) => setForm((current) => {
    const next = { ...current.values, [field]: value };
    const all = validateVehicleRequest(next);
    const kept: Errors = {};
    for (const key of Object.keys(current.errors) as Field[]) if (current.errors[key]) kept[key] = all[key];
    return { values: next, errors: kept };
  });
  /**
   * Shows (or clears) the errors of these fields now, e.g. when leaving a field or picking
   * a suggestion. Fields in ifFilled are only checked when something is typed in them.
   */
  const checkFields = (fields: Field[], ifFilled: Field[] = []) => setForm((current) => {
    const all = validateVehicleRequest(current.values);
    const next = { ...current.errors };
    for (const field of fields) next[field] = all[field];
    for (const field of ifFilled) if (String(current.values[field] ?? "").trim()) next[field] = all[field];
    return { ...current, errors: next };
  });
  const props = (field: Field) => ({
    id: `vehicle-${field}`,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `vehicle-${field}-error` : undefined,
    onBlur: () => checkFields([field]),
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const next = validateVehicleRequest(values);
    setErrors(next);
    const first = (Object.keys(next) as Field[])[0];
    if (first) { document.getElementById(`vehicle-${first}`)?.focus(); return; }
    setSaving(true);
    const payload: VehicleRequestInput = {
      ...values,
      ...(values.forOther ? {} : { forOtherName: "", forOtherPhone: "" }),
      ...(values.purpose === "guest"
        ? { goodsDescription: "", goodsQuantity: "", senderName: "", senderPhone: "", receiverName: "", receiverPhone: "" }
        : { customerName: "", customerPhone: "", passengerCount: null }),
      returnAt: values.roundTrip ? values.returnAt : null,
    };
    try {
      if (editId) await updateMyTrip(editId, payload);
      else await requestVehicle(payload);
      window.dispatchEvent(new Event("asia-notifications-changed"));
      showToast(editId ? "Đã cập nhật yêu cầu" : "Đã gửi yêu cầu đặt xe", "HR sẽ chọn xe công ty hoặc xe ngoài và báo lại cho bạn.", "success");
      router.push("/user/account/trips");
    } catch (reason) {
      if (reason instanceof ApiError && Object.keys(reason.fieldErrors).length) {
        setErrors(reason.fieldErrors as Errors);
        showToast("Chưa gửi được yêu cầu", Object.values(reason.fieldErrors)[0], "error");
      } else showToast("Chưa gửi được yêu cầu", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setSaving(false); }
  };

  // A radio shown as a card (purpose, and who the car is for).
  const choiceCard = (name: string, checked: boolean, onSelect: () => void, title: string, description: string, Icon: typeof Users) => (
    <label className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition-colors ${checked ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" />
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${checked ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"}`}><Icon aria-hidden="true" size={20} /></span>
      <span><span className="block text-sm font-bold text-slate-900">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span>
    </label>
  );
  const purposeOption = (value: VehiclePurpose, title: string, description: string, Icon: typeof Users) =>
    choiceCard("vehicle-purpose", values.purpose === value, () => set("purpose", value), title, description, Icon);
  const forOtherOption = (forOther: boolean, title: string, description: string, Icon: typeof Users) =>
    choiceCard("vehicle-forOther", values.forOther === forOther, () => set("forOther", forOther), title, description, Icon);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/user" className="hover:text-emerald-700">Trang chủ</Link><ChevronRight aria-hidden="true" size={15} />
          <span className="font-semibold text-slate-800">{editId ? "Sửa yêu cầu đặt xe" : "Đặt xe"}</span>
        </nav>
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white"><CarFront aria-hidden="true" size={24} /></span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0d5c0d] sm:text-[32px] sm:leading-tight">{editId ? "Sửa yêu cầu đặt xe" : "Đặt xe"}</h1>
            <p className="mt-1 text-sm text-slate-500">Gửi yêu cầu, HR sẽ chọn xe công ty hoặc xe ngoài (Grab). Đặt trước giờ đi ít nhất {VEHICLE_MIN_LEAD_MINUTES} phút.</p>
          </div>
        </header>

        {loadError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError} <Link href="/user/account/trips" className="font-semibold underline">Về Chuyến xe của tôi</Link></p> : (
          <form noValidate onSubmit={submit} className="space-y-5">
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-slate-900">Người đặt</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {forOtherOption(false, "Đặt cho bản thân", "Dùng thông tin tài khoản của bạn.", UserRound)}
                {forOtherOption(true, "Đặt giúp người khác", "Nhập tên và số điện thoại người cần xe.", UserRoundPlus)}
              </div>
              <dl className="grid gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3 sm:divide-x sm:divide-slate-200 sm:[&>div:not(:first-child)]:pl-6">
                <div><dt className="text-slate-500">{values.forOther ? "Người gửi yêu cầu" : "Họ và tên"}</dt><dd className="mt-0.5 font-semibold text-slate-800">{account?.name}</dd></div>
                <div><dt className="text-slate-500">Email</dt><dd className="mt-0.5 truncate font-semibold text-slate-800">{account?.email}</dd></div>
                <div><dt className="text-slate-500">Bộ phận</dt><dd className="mt-0.5 font-semibold text-slate-800">{account?.department ? getEmployeeDepartmentLabel(account.department) : "—"}</dd></div>
              </dl>
              {values.forOther && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="vehicle-forOtherName" label="Họ tên người được đặt giúp" required error={errors.forOtherName}>
                    <input {...props("forOtherName")} maxLength={150} value={values.forOtherName} onChange={(event) => set("forOtherName", event.target.value)} placeholder="Nhập họ và tên…" className={`${INPUT} ${tone(errors.forOtherName)}`} />
                  </Field>
                  <Field id="vehicle-forOtherPhone" label="Số điện thoại người được đặt giúp" required error={errors.forOtherPhone} hint="HR và tài xế sẽ liên hệ số này.">
                    <input {...props("forOtherPhone")} type="tel" inputMode="tel" maxLength={20} value={values.forOtherPhone} onChange={(event) => set("forOtherPhone", event.target.value)} placeholder="Nhập số điện thoại…" className={`${INPUT} ${tone(errors.forOtherPhone)}`} />
                  </Field>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-slate-900">Mục đích</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {purposeOption("guest", "Đón/đưa khách", "Đưa đón khách hàng, đối tác.", Users)}
                {purposeOption("delivery", "Giao/nhận hàng", "Giao hàng cho khách hoặc nhận hàng về.", Package)}
              </div>
              {values.purpose === "guest" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="vehicle-customerName" label="Tên khách / công ty" required error={errors.customerName} className="sm:col-span-2">
                    <input {...props("customerName")} maxLength={150} value={values.customerName} onChange={(event) => set("customerName", event.target.value)} placeholder="Nhập tên khách hàng hoặc tên công ty…" className={`${INPUT} ${tone(errors.customerName)}`} />
                  </Field>
                  <Field id="vehicle-customerPhone" label="Số điện thoại khách" error={errors.customerPhone} hint="Không bắt buộc.">
                    <input {...props("customerPhone")} type="tel" inputMode="tel" maxLength={20} value={values.customerPhone} onChange={(event) => set("customerPhone", event.target.value)} placeholder="Nhập số điện thoại…" className={`${INPUT} ${tone(errors.customerPhone)}`} />
                  </Field>
                  <Field id="vehicle-passengerCount" label="Số người" required error={errors.passengerCount}>
                    {/* Typed in; only digits are kept (1–50 is checked like the other fields). */}
                    <input {...props("passengerCount")} inputMode="numeric" autoComplete="off" maxLength={2} value={values.passengerCount ?? ""} onChange={(event) => { const digits = event.target.value.replace(/\D/g, ""); set("passengerCount", digits ? Number(digits) : null); }} placeholder="Nhập số người…" className={`${INPUT} ${tone(errors.passengerCount)}`} />
                  </Field>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="vehicle-senderName" label="Tên người gửi" required error={errors.senderName}>
                    <input {...props("senderName")} maxLength={150} value={values.senderName} onChange={(event) => set("senderName", event.target.value)} className={`${INPUT} ${tone(errors.senderName)}`} />
                  </Field>
                  <Field id="vehicle-senderPhone" label="SĐT người gửi" required error={errors.senderPhone}>
                    <input {...props("senderPhone")} type="tel" inputMode="tel" maxLength={20} value={values.senderPhone} onChange={(event) => set("senderPhone", event.target.value)} className={`${INPUT} ${tone(errors.senderPhone)}`} />
                  </Field>
                  <Field id="vehicle-receiverName" label="Tên người nhận" required error={errors.receiverName}>
                    <input {...props("receiverName")} maxLength={150} value={values.receiverName} onChange={(event) => set("receiverName", event.target.value)} className={`${INPUT} ${tone(errors.receiverName)}`} />
                  </Field>
                  <Field id="vehicle-receiverPhone" label="SĐT người nhận" required error={errors.receiverPhone}>
                    <input {...props("receiverPhone")} type="tel" inputMode="tel" maxLength={20} value={values.receiverPhone} onChange={(event) => set("receiverPhone", event.target.value)} className={`${INPUT} ${tone(errors.receiverPhone)}`} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="vehicle-goodsDescription" label="Mô tả hàng hóa" required error={errors.goodsDescription}>
                      <textarea {...props("goodsDescription")} rows={2} maxLength={500} value={values.goodsDescription} onChange={(event) => set("goodsDescription", event.target.value)} className={`${INPUT} ${tone(errors.goodsDescription)}`} placeholder="Ví dụ: nước đóng chai, hàng dễ vỡ…" />
                    </Field>
                  </div>
                  <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"><Package aria-hidden="true" size={18} className="text-emerald-700" />Khối lượng hàng hóa</h3>
                      <span className="text-xs text-slate-500">Ghi tự do theo công việc</span>
                    </div>
                    <Field id="vehicle-goodsQuantity" label="Số lượng / khối lượng hàng" required error={errors.goodsQuantity}>
                      <input {...props("goodsQuantity")} maxLength={200} value={values.goodsQuantity} onChange={(event) => set("goodsQuantity", event.target.value)} placeholder="Ví dụ: 2 công 40 feet, 15 thùng, 500 kg…" className={`${INPUT} ${tone(errors.goodsQuantity)}`} />
                    </Field>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><MapPinned size={22} aria-hidden="true" className="text-green-700" />Lộ trình và thời gian</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="vehicle-pickup" label="Điểm đón" required error={errors.pickup}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="relative min-w-0 flex-1">
                        <CircleDot size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-emerald-600" />
                        <PlaceInput {...props("pickup")} maxLength={300} value={values.pickup} onChange={(value) => set("pickup", value)} onPick={(place) => {
                          set("pickupLocation", place.location ? { ...place.location, accuracy: null } : null);
                          // Check right away (also whether it now equals the destination).
                          checkFields(["pickup"], ["destination"]);
                        }} placeholder="Gõ địa chỉ, tọa độ, Wana, Á Châu… hoặc lấy vị trí hiện tại" className={`${INPUT} pl-10 ${tone(errors.pickup)}`} />
                      </div>
                      <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 text-xs font-semibold text-green-800 hover:bg-green-100 disabled:cursor-wait disabled:opacity-60">
                        <LocateFixed aria-hidden="true" size={17} />{locating ? "Đang lấy vị trí…" : "Lấy vị trí hiện tại"}
                      </button>
                    </div>
                  </Field>
                  {values.pickupLocation ? (
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <span className="inline-flex items-center gap-1.5 font-semibold"><MapPinned aria-hidden="true" size={14} />{values.pickupLocation.accuracy ? `Đã lấy vị trí (sai số khoảng ${values.pickupLocation.accuracy} m)` : "Đã có tọa độ điểm đón"}</span>
                      <a href={mapLink(values.pickupLocation)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Xem trên bản đồ</a>
                      <button type="button" onClick={() => set("pickupLocation", null)} className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600"><X aria-hidden="true" size={13} />Bỏ vị trí</button>
                    </p>
                  ) : null}
                  {locationError && <p role="alert" className="mt-1.5 text-xs text-amber-700">{locationError}</p>}
                </div>
                <Field id="vehicle-destination" label="Điểm đến" required error={errors.destination} className="sm:col-span-2">
                  <div className="relative">
                    <Flag size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-rose-500" />
                    <PlaceInput {...props("destination")} maxLength={300} value={values.destination} onChange={(value) => set("destination", value)} onPick={() => checkFields(["destination"])} placeholder="Gõ địa chỉ, tọa độ, Wana, Á Châu…" className={`${INPUT} pl-10 ${tone(errors.destination)}`} />
                  </div>
                </Field>
                <div className="sm:col-span-2">
                  <DateTimeInput id="vehicle-departAt" showLabels minuteStep={5} dateLabel="Ngày đi" timeLabel="Giờ đi" invalid={Boolean(errors.departAt)} min={localFromNow(VEHICLE_MIN_LEAD_MINUTES)} value={values.departAt} onChange={(value) => set("departAt", value)} />
                  {errors.departAt && <p id="vehicle-departAt-error" className="mt-1.5 text-xs font-medium text-rose-600">{errors.departAt}</p>}
                </div>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={values.roundTrip} onChange={(event) => { set("roundTrip", event.target.checked); if (!event.target.checked) set("returnAt", null); }} className="h-4 w-4 accent-emerald-700" />
                Khứ hồi (có chiều về)
              </label>
              {values.roundTrip && (
                <div>
                  <DateTimeInput id="vehicle-returnAt" showLabels minuteStep={5} dateLabel="Ngày về" timeLabel="Giờ về" invalid={Boolean(errors.returnAt)} min={isCompleteDateTime(values.departAt) ? values.departAt : undefined} value={values.returnAt} onChange={(value) => set("returnAt", value || null)} />
                  {errors.returnAt && <p id="vehicle-returnAt-error" className="mt-1.5 text-xs font-medium text-rose-600">{errors.returnAt}</p>}
                </div>
              )}
              <Field id="vehicle-note" label="Ghi chú" error={errors.note}>
                <textarea {...props("note")} rows={3} maxLength={1000} value={values.note} onChange={(event) => set("note", event.target.value)} className={`${INPUT} ${tone(errors.note)}`} placeholder="Ví dụ: khách có hành lý cồng kềnh, cần xe 7 chỗ…" />
              </Field>
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60">
                <Send size={20} aria-hidden="true" />
                {saving ? "Đang gửi…" : editId ? "Lưu thay đổi" : "Gửi yêu cầu đặt xe"}
              </button>
            </div>
            </section>
          </form>
        )}
      </div>
      <Footer />
    </main>
  );
}
