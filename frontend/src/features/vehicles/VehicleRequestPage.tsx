"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CarFront, ChevronRight, Package, Users } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ApiError } from "@/services/api";
import { useUserSession } from "@/lib/userSession";
import { showToast } from "@/features/admin/auth/notify";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import {
  getMyTrips,
  requestVehicle,
  toLocalInput,
  updateMyTrip,
  VEHICLE_MIN_LEAD_MINUTES,
  type VehiclePurpose,
  type VehicleRequestInput,
} from "@/services/vehicle.service";

type Field = keyof VehicleRequestInput;
type Errors = Partial<Record<Field, string>>;

const EMPTY: VehicleRequestInput = {
  purpose: "guest", customerName: "", customerPhone: "", passengerCount: 1, goodsDescription: "",
  senderName: "", senderPhone: "", receiverName: "", receiverPhone: "",
  pickup: "", destination: "", departAt: "", roundTrip: false, returnAt: null, expectedEndAt: "", note: "",
};
const PHONE = /^\+?[\d\s.-]{8,20}$/;

/** Current Vietnam time plus some minutes, as a datetime-local value. */
function localFromNow(minutes: number) {
  return toLocalInput(new Date(Date.now() + minutes * 60_000).toISOString());
}

/** Same rules as the server, so mistakes show before sending. */
export function validateVehicleRequest(values: VehicleRequestInput, now = Date.now()): Errors {
  const errors: Errors = {};
  if (values.purpose === "guest") {
    if (!values.customerName.trim()) errors.customerName = "Vui lòng nhập tên khách hoặc công ty.";
    if (values.customerPhone.trim() && !PHONE.test(values.customerPhone.trim())) errors.customerPhone = "Số điện thoại không hợp lệ.";
    if (!values.passengerCount || values.passengerCount < 1 || values.passengerCount > 50) errors.passengerCount = "Số người từ 1 đến 50.";
  } else {
    // Deliveries: name and phone of both sides are required.
    if (!values.senderName.trim()) errors.senderName = "Vui lòng nhập tên người gửi.";
    if (!values.senderPhone.trim()) errors.senderPhone = "Vui lòng nhập số điện thoại người gửi.";
    else if (!PHONE.test(values.senderPhone.trim())) errors.senderPhone = "Số điện thoại không hợp lệ.";
    if (!values.receiverName.trim()) errors.receiverName = "Vui lòng nhập tên người nhận.";
    if (!values.receiverPhone.trim()) errors.receiverPhone = "Vui lòng nhập số điện thoại người nhận.";
    else if (!PHONE.test(values.receiverPhone.trim())) errors.receiverPhone = "Số điện thoại không hợp lệ.";
    if (!values.goodsDescription.trim()) errors.goodsDescription = "Vui lòng mô tả hàng hóa.";
  }
  if (!values.pickup.trim()) errors.pickup = "Vui lòng nhập điểm đón.";
  if (!values.destination.trim()) errors.destination = "Vui lòng nhập điểm đến.";
  if (!values.departAt) errors.departAt = "Vui lòng chọn giờ đi.";
  else if (values.departAt < toLocalInput(new Date(now + VEHICLE_MIN_LEAD_MINUTES * 60_000).toISOString())) errors.departAt = `Vui lòng đặt xe trước giờ đi ít nhất ${VEHICLE_MIN_LEAD_MINUTES} phút.`;
  if (values.roundTrip) {
    if (!values.returnAt) errors.returnAt = "Vui lòng chọn giờ về.";
    else if (values.departAt && values.returnAt <= values.departAt) errors.returnAt = "Giờ về phải sau giờ đi.";
  }
  if (!values.expectedEndAt) errors.expectedEndAt = "Vui lòng chọn thời gian hoàn thành dự kiến.";
  else if (values.departAt && values.expectedEndAt <= values.departAt) errors.expectedEndAt = "Thời gian hoàn thành phải sau giờ đi.";
  else if (values.roundTrip && values.returnAt && values.expectedEndAt < values.returnAt) errors.expectedEndAt = "Thời gian hoàn thành không được trước giờ về.";
  return errors;
}

const INPUT = "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2";
const tone = (error?: string) => (error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20");

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
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
  const [values, setValues] = useState<VehicleRequestInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!editId) return;
    const controller = new AbortController();
    getMyTrips(controller.signal).then((trips) => {
      const trip = trips.find((item) => item.id === editId);
      if (!trip || trip.status !== "pending") { setLoadError("Chỉ sửa được yêu cầu đang chờ HR xử lý."); return; }
      setValues({
        purpose: trip.purpose, customerName: trip.customerName, customerPhone: trip.customerPhone, passengerCount: trip.passengerCount ?? 1,
        goodsDescription: trip.goodsDescription, senderName: trip.senderName, senderPhone: trip.senderPhone,
        receiverName: trip.receiverName, receiverPhone: trip.receiverPhone, pickup: trip.pickup, destination: trip.destination, departAt: toLocalInput(trip.departAt),
        roundTrip: trip.roundTrip, returnAt: trip.returnAt ? toLocalInput(trip.returnAt) : null, expectedEndAt: toLocalInput(trip.expectedEndAt), note: trip.note,
      });
    }).catch((reason) => { if (!controller.signal.aborted) setLoadError(reason instanceof Error ? reason.message : "Không tải được yêu cầu."); });
    return () => controller.abort();
  }, [editId]);

  const set = <K extends Field>(field: K, value: VehicleRequestInput[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const props = (field: Field) => ({ id: `vehicle-${field}`, "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `vehicle-${field}-error` : undefined });

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
      ...(values.purpose === "guest"
        ? { goodsDescription: "", senderName: "", senderPhone: "", receiverName: "", receiverPhone: "" }
        : { customerName: "", customerPhone: "", passengerCount: null }),
      returnAt: values.roundTrip ? values.returnAt : null,
    };
    try {
      if (editId) await updateMyTrip(editId, payload);
      else await requestVehicle(payload);
      window.dispatchEvent(new Event("asia-notifications-changed"));
      showToast(editId ? "Đã cập nhật yêu cầu" : "Đã gửi yêu cầu đặt xe", "HR sẽ chọn xe công ty hoặc xe ngoài và báo lại cho bạn.", "success");
      router.push("/account/trips");
    } catch (reason) {
      if (reason instanceof ApiError && Object.keys(reason.fieldErrors).length) {
        setErrors(reason.fieldErrors as Errors);
        showToast("Chưa gửi được yêu cầu", Object.values(reason.fieldErrors)[0], "error");
      } else showToast("Chưa gửi được yêu cầu", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setSaving(false); }
  };

  const purposeOption = (value: VehiclePurpose, title: string, description: string, Icon: typeof Users) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${values.purpose === value ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <input type="radio" name="vehicle-purpose" value={value} checked={values.purpose === value} onChange={() => set("purpose", value)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" />
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${values.purpose === value ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"}`}><Icon aria-hidden="true" size={20} /></span>
      <span><span className="block text-sm font-bold text-slate-900">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span>
    </label>
  );

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-700">Trang chủ</Link><ChevronRight aria-hidden="true" size={15} />
          <span className="font-semibold text-slate-800">{editId ? "Sửa yêu cầu đặt xe" : "Đặt xe"}</span>
        </nav>
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white"><CarFront aria-hidden="true" size={24} /></span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0d5c0d]">{editId ? "Sửa yêu cầu đặt xe" : "Đặt xe"}</h1>
            <p className="mt-1 text-sm text-slate-500">Gửi yêu cầu, HR sẽ chọn xe công ty hoặc xe ngoài (Grab). Đặt trước giờ đi ít nhất {VEHICLE_MIN_LEAD_MINUTES} phút.</p>
          </div>
        </header>

        {loadError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError} <Link href="/account/trips" className="font-semibold underline">Về Chuyến xe của tôi</Link></p> : (
          <form noValidate onSubmit={submit} className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-3 text-base font-bold text-slate-900">Người đặt</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-slate-500">Họ và tên</dt><dd className="mt-0.5 font-semibold text-slate-800">{account?.name}</dd></div>
                <div><dt className="text-slate-500">Email</dt><dd className="mt-0.5 truncate font-semibold text-slate-800">{account?.email}</dd></div>
                <div><dt className="text-slate-500">Bộ phận</dt><dd className="mt-0.5 font-semibold text-slate-800">{account?.department ? getEmployeeDepartmentLabel(account.department) : "—"}</dd></div>
              </dl>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-slate-900">Mục đích</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {purposeOption("guest", "Đón/đưa khách", "Đưa đón khách hàng, đối tác.", Users)}
                {purposeOption("delivery", "Giao/nhận hàng", "Giao hàng cho khách hoặc nhận hàng về.", Package)}
              </div>
              {values.purpose === "guest" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="vehicle-customerName" label="Tên khách / công ty" required error={errors.customerName}>
                    <input {...props("customerName")} maxLength={150} value={values.customerName} onChange={(event) => set("customerName", event.target.value)} className={`${INPUT} ${tone(errors.customerName)}`} />
                  </Field>
                  <Field id="vehicle-customerPhone" label="Số điện thoại khách" error={errors.customerPhone} hint="Không bắt buộc.">
                    <input {...props("customerPhone")} type="tel" inputMode="tel" maxLength={20} value={values.customerPhone} onChange={(event) => set("customerPhone", event.target.value)} className={`${INPUT} ${tone(errors.customerPhone)}`} />
                  </Field>
                  <Field id="vehicle-passengerCount" label="Số người" required error={errors.passengerCount}>
                    <input {...props("passengerCount")} type="number" min={1} max={50} value={values.passengerCount ?? ""} onChange={(event) => set("passengerCount", event.target.value ? Number(event.target.value) : null)} className={`${INPUT} ${tone(errors.passengerCount)}`} />
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
                      <textarea {...props("goodsDescription")} rows={2} maxLength={500} value={values.goodsDescription} onChange={(event) => set("goodsDescription", event.target.value)} className={`${INPUT} ${tone(errors.goodsDescription)}`} placeholder="Ví dụ: 10 thùng nước, hàng dễ vỡ…" />
                    </Field>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-slate-900">Lộ trình và thời gian</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="vehicle-pickup" label="Điểm đón" required error={errors.pickup}>
                  <input {...props("pickup")} maxLength={300} value={values.pickup} onChange={(event) => set("pickup", event.target.value)} className={`${INPUT} ${tone(errors.pickup)}`} />
                </Field>
                <Field id="vehicle-destination" label="Điểm đến" required error={errors.destination}>
                  <input {...props("destination")} maxLength={300} value={values.destination} onChange={(event) => set("destination", event.target.value)} className={`${INPUT} ${tone(errors.destination)}`} />
                </Field>
                <Field id="vehicle-departAt" label="Giờ đi" required error={errors.departAt}>
                  <input {...props("departAt")} type="datetime-local" min={localFromNow(VEHICLE_MIN_LEAD_MINUTES)} value={values.departAt} onChange={(event) => set("departAt", event.target.value)} className={`${INPUT} ${tone(errors.departAt)}`} />
                </Field>
                <Field id="vehicle-expectedEndAt" label="Hoàn thành dự kiến" required error={errors.expectedEndAt} hint="Quá giờ này mà chưa chốt, HR sẽ được nhắc.">
                  <input {...props("expectedEndAt")} type="datetime-local" min={values.departAt || undefined} value={values.expectedEndAt} onChange={(event) => set("expectedEndAt", event.target.value)} className={`${INPUT} ${tone(errors.expectedEndAt)}`} />
                </Field>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={values.roundTrip} onChange={(event) => { set("roundTrip", event.target.checked); if (!event.target.checked) set("returnAt", null); }} className="h-4 w-4 accent-emerald-700" />
                Khứ hồi (có chiều về)
              </label>
              {values.roundTrip && (
                <div className="sm:w-1/2 sm:pr-2">
                  <Field id="vehicle-returnAt" label="Giờ về" required error={errors.returnAt}>
                    <input {...props("returnAt")} type="datetime-local" min={values.departAt || undefined} value={values.returnAt ?? ""} onChange={(event) => set("returnAt", event.target.value || null)} className={`${INPUT} ${tone(errors.returnAt)}`} />
                  </Field>
                </div>
              )}
              <Field id="vehicle-note" label="Ghi chú" error={errors.note}>
                <textarea {...props("note")} rows={3} maxLength={1000} value={values.note} onChange={(event) => set("note", event.target.value)} className={`${INPUT} ${tone(errors.note)}`} placeholder="Ví dụ: khách có hành lý cồng kềnh, cần xe 7 chỗ…" />
              </Field>
            </section>

            <div className="flex flex-wrap justify-end gap-3">
              <Link href="/account/trips" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Chuyến xe của tôi</Link>
              <button type="submit" disabled={saving} className="rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
                {saving ? "Đang gửi…" : editId ? "Lưu thay đổi" : "Gửi yêu cầu đặt xe"}
              </button>
            </div>
          </form>
        )}
      </div>
      <Footer />
    </main>
  );
}
