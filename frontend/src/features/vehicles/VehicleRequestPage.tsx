"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, CarFront, ChevronRight, LocateFixed, Mail, Package, ImagePlus, Send, UserRound, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import UnsavedChangesDialog from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import Footer from "@/components/layout/Footer";
import { ApiError } from "@/services/api";
import { useUserSession } from "@/lib/userSession";
import { showToast } from "@/features/admin/auth/notify";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import { getPublicEmployees } from "@/services/employee.service";
import { normalizeSearchText } from "@/utils/normalizeSearchText";
import type { Employee } from "@/types/employee";
import PlaceInput from "./PlaceInput";
import DateTimeInput, { isCompleteDateTime } from "@/components/ui/DateTimeInput";
import { validateVehicleRequest, vietnamLocal, VEHICLE_MIN_LEAD_MINUTES, type VehicleRequestErrors as Errors } from "@/lib/vehicleValidation";
import {
  getMyTrips,
  mapLink,
  requestVehicle,
  VEHICLE_MAX_ATTACHMENTS,
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

function Field({ id, label, labelAction, required, error, hint, children, className }: { id: string; label: string; labelAction?: ReactNode; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</label>{labelAction}</div>
      {children}
      {error ? <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const image = useRef<HTMLImageElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (image.current) image.current.src = objectUrl;
    if (link.current) link.current.href = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
    <a ref={link} target="_blank" rel="noopener noreferrer" aria-label={`Xem ảnh ${file.name}`} className="block aspect-square focus-visible:outline-2 focus-visible:outline-emerald-600">
      {/* Local previews use browser object URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} alt={file.name} className="h-full w-full object-cover" />
    </a>
    <button type="button" onClick={onRemove} aria-label={`Gỡ ảnh ${file.name}`} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-slate-900/75 text-white hover:bg-rose-700"><X size={16} /></button>
    <p title={file.name} className="truncate px-2 py-1.5 text-xs text-slate-600">{file.name}</p>
  </div>;
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
  const [baseline, setBaseline] = useState(() => JSON.stringify({ values: EMPTY, extraDestinations: [] }));
  const formRef = useRef<HTMLFormElement>(null);
  const saveAndLeave = useRef(false);
  const setValues = (update: VehicleRequestInput | ((current: VehicleRequestInput) => VehicleRequestInput)) =>
    setForm((current) => ({ ...current, values: typeof update === "function" ? update(current.values) : update }));
  const setErrors = (update: Errors | ((current: Errors) => Errors)) =>
    setForm((current) => ({ ...current, errors: typeof update === "function" ? update(current.errors) : update }));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [extraDestinations, setExtraDestinations] = useState<string[]>([]);
  const [extraDestinationError, setExtraDestinationError] = useState("");
  const [invalidExtraDestination, setInvalidExtraDestination] = useState<number | null>(null);
  const [goodsImages, setGoodsImages] = useState<File[]>([]);
  const [goodsImageError, setGoodsImageError] = useState("");
  const dirty = JSON.stringify({ values, extraDestinations }) !== baseline || goodsImages.length > 0;
  const navigation = useUnsavedChanges(dirty, saving);
  const [otherMode, setOtherMode] = useState<"search" | "manual">("search");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeState, setEmployeeState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (!values.forOther || otherMode !== "search") return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const first = await getPublicEmployees({ page: 1, limit: 100 }, controller.signal);
        const pages = await Promise.all(Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, index) => getPublicEmployees({ page: index + 2, limit: 100 }, controller.signal)));
        if (!controller.signal.aborted) { setEmployees([first, ...pages].flatMap(page => page.items)); setEmployeeState("ready"); }
      } catch { if (!controller.signal.aborted) setEmployeeState("error"); }
    };
    void load();
    return () => controller.abort();
  }, [values.forOther, otherMode]);

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
      const loadedValues: VehicleRequestInput = {
        forOther: trip.forOther, forOtherName: trip.forOtherName, forOtherPhone: trip.forOtherPhone,
        purpose: trip.purpose, customerName: trip.customerName, customerPhone: trip.customerPhone, passengerCount: trip.passengerCount ?? 1,
        goodsDescription: trip.goodsDescription, goodsQuantity: trip.goodsQuantity, senderName: trip.senderName, senderPhone: trip.senderPhone,
        receiverName: trip.receiverName, receiverPhone: trip.receiverPhone, pickup: trip.pickup, pickupLocation: trip.pickupLocation, destination: trip.destination, departAt: toLocalInput(trip.departAt),
        roundTrip: trip.roundTrip, returnAt: trip.returnAt ? toLocalInput(trip.returnAt) : null, note: trip.note,
      };
      setBaseline(JSON.stringify({ values: loadedValues, extraDestinations: trip.extraDestinations ?? [] }));
      setExtraDestinations(trip.extraDestinations ?? []);
      setValues(loadedValues);
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
    const leaveAfterSave = saveAndLeave.current;
    saveAndLeave.current = false;
    if (saving) return;
    const invalidDestination = extraDestinations.findIndex(destination => destination.trim().length < 3);
    if (extraDestinations.length > 20) {
      if (leaveAfterSave) navigation.cancelNavigation();
      setExtraDestinationError("Chỉ được thêm tối đa 20 điểm đến.");
      return;
    }
    if (invalidDestination !== -1) {
      if (leaveAfterSave) navigation.cancelNavigation();
      setInvalidExtraDestination(invalidDestination);
      setExtraDestinationError(`Điểm đến ${invalidDestination + 2} cần ít nhất 3 ký tự.`);
      const input = document.getElementById(`vehicle-extra-destination-${invalidDestination}`);
      const section = input?.closest("details");
      if (section) section.open = true;
      requestAnimationFrame(() => input?.focus());
      return;
    }
    if (editId && goodsImages.length) {
      if (leaveAfterSave) navigation.cancelNavigation();
      setGoodsImageError("Chỉ gửi được ảnh khi tạo yêu cầu mới. Vui lòng gỡ ảnh để lưu thay đổi.");
      return;
    }
    const next = validateVehicleRequest(values);
    setErrors(next);
    const first = (Object.keys(next) as Field[])[0];
    if (first) {
      if (leaveAfterSave) navigation.cancelNavigation();
      const element = document.getElementById(`vehicle-${first}`) ?? (first === "forOtherName" ? document.getElementById("vehicle-employee-search") : null);
      const section = element?.closest("details");
      if (section) section.open = true;
      requestAnimationFrame(() => { element?.scrollIntoView({ block: "center", behavior: "smooth" }); (element?.querySelector<HTMLElement>("input, button, select, textarea") ?? element)?.focus(); });
      return;
    }
    setSaving(true);
    const payload: VehicleRequestInput = {
      ...values,
      extraDestinations: extraDestinations.map(destination => destination.trim()),
      ...(values.forOther ? {} : { forOtherName: "", forOtherPhone: "" }),
      ...(values.purpose === "guest"
        ? { goodsDescription: "", goodsQuantity: "", senderName: "", senderPhone: "", receiverName: "", receiverPhone: "" }
        : { customerName: "", customerPhone: "", passengerCount: null }),
      returnAt: values.roundTrip ? values.returnAt : null,
    };
    try {
      if (editId) await updateMyTrip(editId, payload);
      else await requestVehicle(payload, goodsImages);
      window.dispatchEvent(new Event("asia-notifications-changed"));
      showToast(editId ? "Đã cập nhật yêu cầu" : "Đã gửi yêu cầu đặt xe", "HR sẽ chọn xe công ty hoặc xe ngoài và báo lại cho bạn.", "success");
      await navigation.leave(leaveAfterSave ? undefined : () => router.push("/user/account/trips"));
    } catch (reason) {
      if (leaveAfterSave) navigation.cancelNavigation();
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

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <UnsavedChangesDialog open={navigation.isPromptOpen} saving={saving} description="Bạn muốn lưu yêu cầu đặt xe trước khi rời trang?" onContinue={navigation.cancelNavigation} onDiscard={() => void navigation.leave()} onSave={() => { navigation.hidePrompt(); saveAndLeave.current = true; requestAnimationFrame(() => formRef.current?.requestSubmit()); }} />
      <Navbar />
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:py-10">
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
          <form ref={formRef} noValidate onSubmit={submit} className="grid gap-5 md:grid-cols-2 md:items-start">
            <div className="contents md:flex md:flex-col md:gap-5">
            <details open className="order-1 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><summary className="cursor-pointer text-lg font-semibold text-slate-900">Người đặt</summary><div className="mt-4 space-y-4">
              <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="relative shrink-0">
                    {account?.avatar ? <img src={account.avatar} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">{account?.name?.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase() || "—"}</span>}
                    <span aria-hidden="true" className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-lg font-bold text-slate-900">{account?.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex min-w-0 items-center gap-1.5"><Mail aria-hidden="true" size={15} className="shrink-0" /><span className="break-all">{account?.email}</span></span>
                      {account?.department && <>
                        <span aria-hidden="true" className="text-slate-300">•</span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">Bộ phận {getEmployeeDepartmentLabel(account.department)}</span>
                      </>}
                    </div>
                  </div>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-bold text-slate-700 xl:justify-start">
                  Đặt giúp người khác
                  <input type="checkbox" role="switch" checked={values.forOther} onChange={event => { set("forOther", event.target.checked); if (event.target.checked) setEmployeeState("loading"); }} className="peer sr-only" />
                  <span aria-hidden="true" className="relative block h-7 w-12 shrink-0 rounded-full bg-slate-200 transition-colors duration-300 peer-checked:bg-[#F59E0B] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700 motion-reduce:transition-none">
                    <span className={`absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 motion-reduce:transition-none ${values.forOther ? "translate-x-5 text-emerald-700" : "translate-x-0 text-slate-400"}`}><UserRound size={13} /></span>
                  </span>
                </label>
              </div>
              {values.forOther && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="text-sm font-bold text-slate-900">Người được đặt giúp</h3>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cách chọn người được đặt giúp">{([ ["search", "Chọn nhân viên"], ["manual", "Nhập thủ công"] ] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={otherMode === mode} onClick={() => { setOtherMode(mode); if (mode === "search") setEmployeeState("loading"); }} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${otherMode === mode ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</div>
                  {otherMode === "search" && !values.forOtherName.trim() && <div><label htmlFor="vehicle-employee-search" className="mb-1.5 block text-sm font-semibold text-slate-700">Tìm nhân viên</label><input id="vehicle-employee-search" value={employeeQuery} onChange={event => setEmployeeQuery(event.target.value)} placeholder="Tìm theo tên hoặc bộ phận..." aria-invalid={Boolean(errors.forOtherName)} className={`${INPUT} ${tone(errors.forOtherName)}`} />
                    {errors.forOtherName && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.forOtherName}</p>}
                    <div className="mt-2 max-h-52 space-y-2 overflow-y-auto" aria-live="polite">{employeeState === "loading" ? <p className="text-sm text-slate-500">Đang tải nhân viên…</p> : employeeState === "error" ? <p role="alert" className="text-sm text-rose-700">Không tải được danh sách nhân viên. Vui lòng chọn nhập thủ công.</p> : (() => { const query = normalizeSearchText(employeeQuery); const matches = employees.filter(employee => normalizeSearchText(`${employee.name} ${getEmployeeDepartmentLabel(employee.department)}`).includes(query)).slice(0, 20); return matches.length ? matches.map(employee => <button key={employee.id} type="button" onClick={() => { setValues(current => ({...current, forOtherName: employee.name, forOtherPhone: employee.phone || ""})); setEmployeeQuery(employee.name); setErrors(current => ({...current, forOtherName: undefined, forOtherPhone: undefined})); }} className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-emerald-400"><strong>{employee.name}</strong><span className="block text-xs text-slate-500">{getEmployeeDepartmentLabel(employee.department)}</span></button>) : <p className="text-sm text-slate-500">Không tìm thấy nhân viên.</p>; })()}</div>
                  </div>}
                  {(otherMode === "manual" || values.forOtherName.trim()) && <>
                    <Field id="vehicle-forOtherName" label={otherMode === "search" ? "Người đã chọn" : "Họ tên người được đặt giúp"} required error={errors.forOtherName}>{otherMode === "search" ? (
                      <div className="relative">
                        <input {...props("forOtherName")} maxLength={150} value={values.forOtherName} readOnly className={`${INPUT} pr-12 ${tone(errors.forOtherName)}`} />
                        {/* Bỏ người đã chọn → quay lại bảng tìm nhân viên. */}
                        <button type="button" aria-label="Bỏ chọn nhân viên, chọn lại" onClick={() => { setValues(current => ({...current, forOtherName: "", forOtherPhone: ""})); setEmployeeQuery(""); setErrors(current => ({...current, forOtherName: undefined, forOtherPhone: undefined})); }} className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-emerald-700"><X aria-hidden="true" size={18} /></button>
                      </div>
                    ) : <input {...props("forOtherName")} maxLength={150} value={values.forOtherName} onChange={event => set("forOtherName", event.target.value)} placeholder="Nhập họ và tên…" className={`${INPUT} ${tone(errors.forOtherName)}`} />}</Field>
                    <Field id="vehicle-forOtherPhone" label="Số điện thoại người được đặt giúp" required error={errors.forOtherPhone} hint="Bắt buộc nhập số điện thoại Việt Nam để HR và tài xế liên hệ."><input {...props("forOtherPhone")} type="tel" inputMode="tel" maxLength={20} value={values.forOtherPhone} onChange={event => set("forOtherPhone", event.target.value)} placeholder="Nhập số điện thoại…" className={`${INPUT} ${tone(errors.forOtherPhone)}`} /></Field>
                  </>}
                </div>
              )}
            </div></details>

            <details open className="order-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><summary className="cursor-pointer text-lg font-semibold text-slate-900">Mục đích</summary><div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {purposeOption("guest", "Đón/đưa khách", "Đưa đón khách hàng, đối tác.", Users)}
                {purposeOption("delivery", "Giao/nhận hàng", "Giao hàng cho khách hoặc nhận hàng về.", Package)}
              </div>
              {values.purpose === "guest" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="vehicle-customerName" label="Tên khách / công ty" required error={errors.customerName} className="sm:col-span-2">
                    <input {...props("customerName")} maxLength={150} value={values.customerName} onChange={(event) => set("customerName", event.target.value)} placeholder="Nhập tên khách hàng hoặc tên công ty…" className={`${INPUT} ${tone(errors.customerName)}`} />
                  </Field>
                  <Field id="vehicle-customerPhone" label="Số điện thoại khách" error={errors.customerPhone}>
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
            </div></details>
            </div>
            <div className="contents md:flex md:flex-col md:gap-5">
            <details open className="order-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><summary className="cursor-pointer text-lg font-semibold text-slate-900">Lộ trình và thời gian</summary><div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-4 sm:col-span-2">
                  <div className="relative ml-2 border-l-2 border-dashed border-slate-200 pl-5">
                    <div className="relative pb-4"><span aria-hidden="true" className="absolute -left-[27px] top-8 h-3 w-3 rounded-full border-[3px] border-emerald-500 bg-white" />
                      <Field id="vehicle-pickup" label="Điểm đón" labelAction={<button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-indigo-600 disabled:opacity-60"><LocateFixed size={16}/>{locating ? "Đang lấy vị trí…" : "Lấy vị trí hiện tại"}</button>} required error={errors.pickup}><div className="relative"><PlaceInput {...props("pickup")} showAllOnEmpty maxLength={300} value={values.pickup} onChange={value => { set("pickup", value); set("pickupLocation", null); }} onPick={place => { set("pickupLocation", place.location ? {...place.location, accuracy: null} : null); checkFields(["pickup"], ["destination"]); }} placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1, TP.HCM" className={`${INPUT} pr-12 ${tone(errors.pickup)}`} /><button type="button" aria-label="Đổi điểm đón và điểm đến" onClick={() => { setValues(current => ({...current, pickup: current.destination, destination: current.pickup, pickupLocation: null})); setErrors(current => ({...current, pickup: undefined, destination: undefined})); }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"><ArrowDownUp size={16}/></button></div></Field>
                    </div>
                    <div className="relative pb-4"><span aria-hidden="true" className="absolute -left-[27px] top-8 h-3 w-3 rounded-full border-[3px] border-indigo-500 bg-white" /><Field id="vehicle-destination" label="Điểm đến 1" required error={errors.destination}><PlaceInput {...props("destination")} maxLength={300} value={values.destination} onChange={value => set("destination", value)} onPick={() => checkFields(["destination"])} placeholder="Ví dụ: Bến xe Miền Đông mới" className={`${INPUT} ${tone(errors.destination)}`} /></Field></div>
                    {extraDestinations.map((destination, index) => <div key={index} className="relative pb-4"><span aria-hidden="true" className="absolute -left-[27px] top-8 h-3 w-3 rounded border-[3px] border-orange-400 bg-white"/><Field id={`vehicle-extra-destination-${index}`} label={`Điểm đến ${index + 2}`} required error={invalidExtraDestination === index ? extraDestinationError : undefined}><div className="relative"><PlaceInput id={`vehicle-extra-destination-${index}`} aria-invalid={invalidExtraDestination === index} aria-describedby={invalidExtraDestination === index ? `vehicle-extra-destination-${index}-error` : undefined} maxLength={300} value={destination} onChange={value => { setExtraDestinations(current => current.map((item, i) => i === index ? value : item)); setExtraDestinationError(""); setInvalidExtraDestination(null); }} onBlur={() => { if (destination.trim().length < 3) { setInvalidExtraDestination(index); setExtraDestinationError(`Điểm đến ${index + 2} cần ít nhất 3 ký tự.`); } }} placeholder="Nhập địa chỉ điểm đến" className={`${INPUT} pr-12 ${tone(invalidExtraDestination === index ? extraDestinationError : undefined)}`} /><button type="button" aria-label={`Xóa điểm đến ${index + 2}`} onClick={() => { setExtraDestinations(current => current.filter((_, i) => i !== index)); setExtraDestinationError(""); setInvalidExtraDestination(null); }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"><X size={16}/></button></div></Field></div>)}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={extraDestinations.length >= 20} onClick={() => { const next = extraDestinations.length; setExtraDestinations(current => [...current, ""]); requestAnimationFrame(() => document.getElementById(`vehicle-extra-destination-${next}`)?.focus()); }} className="min-h-11 text-sm font-semibold text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">+ Thêm điểm đến</button></div>
                  {extraDestinationError && invalidExtraDestination === null && <p role="alert" className="text-sm text-rose-700">{extraDestinationError}</p>}
                  {values.pickupLocation && <p className="text-xs text-emerald-800">Đã có tọa độ điểm đón · <a href={mapLink(values.pickupLocation)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Xem trên bản đồ</a> <button type="button" onClick={() => set("pickupLocation", null)} className="ml-2 text-slate-600">Bỏ vị trí</button></p>}
                  {locationError && <p role="alert" className="text-xs text-amber-700">{locationError}</p>}
                </div>
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
            </div></details>
            <details className="order-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><summary className="cursor-pointer text-lg font-semibold text-slate-900">Thông tin bổ sung</summary><div className="mt-4">
              <Field id="vehicle-note" label="Ghi chú" error={errors.note}>
                <textarea {...props("note")} rows={3} maxLength={1000} value={values.note} onChange={(event) => set("note", event.target.value)} className={`${INPUT} ${tone(errors.note)}`} placeholder="Ví dụ: khách có hành lý cồng kềnh, cần xe 7 chỗ…" />
              </Field>
              <div className="mt-4">
                <p className="block text-sm font-semibold text-slate-700">Ảnh đính kèm <span className="font-normal text-slate-500">· Không bắt buộc</span></p>
                <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {goodsImages.map((file, index) => <ImagePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => { setGoodsImages(current => current.filter((_, i) => i !== index)); setGoodsImageError(""); }} />)}
                    {goodsImages.length < VEHICLE_MAX_ATTACHMENTS && <label htmlFor="vehicle-goods-images" className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white p-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-within:outline-2 focus-within:outline-emerald-600">
                      <ImagePlus size={23} aria-hidden="true" /><span>Thêm ảnh</span>
                      <input id="vehicle-goods-images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={event => {
                        const chosen = Array.from(event.target.files ?? []);
                        event.target.value = "";
                        const valid = chosen.filter(file => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
                        setGoodsImages(current => [...current, ...valid].slice(0, VEHICLE_MAX_ATTACHMENTS));
                        setGoodsImageError(valid.length < chosen.length ? "Có ảnh bị bỏ qua: chỉ nhận JPG, PNG, WebP tối đa 5MB." : goodsImages.length + valid.length > VEHICLE_MAX_ATTACHMENTS ? `Chỉ gửi tối đa ${VEHICLE_MAX_ATTACHMENTS} ảnh.` : "");
                      }} />
                    </label>}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Chọn ảnh hàng hóa hoặc thông tin cần lưu ý (tối đa {VEHICLE_MAX_ATTACHMENTS} ảnh, mỗi ảnh ≤ 5MB). Bấm vào ảnh để xem lớn.</p>
                  {goodsImageError && <p role="status" className="mt-2 text-xs text-amber-700">{goodsImageError}</p>}
                </div>
              </div>
            </div></details>
            </div>
            <div className="order-5 flex flex-wrap items-center justify-end gap-3 pt-2 md:col-span-2">
              <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60">
                <Send size={20} aria-hidden="true" />
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
