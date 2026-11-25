"use client";

import { useSearchParams } from "next/navigation";
import { Building2, CalendarDays, Car, CheckCircle2, ChevronLeft, ChevronRight, CircleDot, Download, RotateCcw, Search, Target, Wallet, XCircle, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAdminPermissions } from "@/lib/adminPermissions";
import { useDelayedLoading } from "@/lib/useDelayedLoading";
import {
  toLocalInput,
  formatVnd,
  getVehicleReport,
  getVehicleTrip,
  listVehicleTrips,
  vehicleReportExportUrl,
  VEHICLE_PURPOSE_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONES,
  VEHICLE_TYPE_LABELS,
  type VehicleListParams,
  type VehicleReport,
  type VehicleTrip,
} from "@/services/vehicle.service";
import VehicleTripDialog from "./VehicleTripDialog";
import MonthPicker from "./MonthPicker";
import { mediaFont } from "@/features/admin/dashboard/media-font";
import { AdminSelect } from "@/features/admin/dashboard/components/AdminSelect";

const currentMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date());

function TripsTable({ onOpen, refreshKey }: { onOpen: (trip: VehicleTrip) => void; refreshKey: number }) {
  const [filters, setFilters] = useState<VehicleListParams>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof listVehicleTrips>> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedLoading(loading);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      listVehicleTrips({ ...filters, search: search.trim() || undefined, page, limit: 10 }, controller.signal)
        .then((result) => { if (controller.signal.aborted) return; const lastPage = Math.max(1, result.pagination.totalPages); if (page > lastPage) { setPage(lastPage); return; } setData(result); setError(""); })
        .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được danh sách chuyến xe."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filters, search, page, refreshKey]);

  const change = (next: VehicleListParams) => { setFilters((current) => ({ ...current, ...next })); setPage(1); };
  const totalPages = Math.max(1, data?.pagination.totalPages ?? 1);
  const pageNumbers = [...new Set([1, totalPages, page - 1, page, page + 1])].filter((number) => number >= 1 && number <= totalPages).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="relative min-w-0 flex-1 basis-48">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm theo người đặt hoặc khách hàng…" aria-label="Tìm theo người đặt hoặc khách hàng" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
        </label>
        <AdminSelect value={filters.status ?? ""} onChange={(value) => change({ status: (value || undefined) as VehicleListParams["status"] })} options={[{ value: "", label: "Tất cả trạng thái" }, ...Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => ({ value, label }))]} searchable={false} showSelectionCheck={false} icon={<CircleDot className="h-4 w-4 text-emerald-600" />} className="w-full sm:w-56" />
        <AdminSelect value={filters.vehicleType ?? ""} onChange={(value) => change({ vehicleType: (value || undefined) as VehicleListParams["vehicleType"] })} options={[{ value: "", label: "Tất cả loại xe" }, ...Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} searchable={false} showSelectionCheck={false} icon={<Car className="h-4 w-4 text-sky-600" />} className="w-full shrink-0 sm:w-52" />
        <AdminSelect value={filters.purpose ?? ""} onChange={(value) => change({ purpose: (value || undefined) as VehicleListParams["purpose"] })} options={[{ value: "", label: "Tất cả mục đích" }, ...Object.entries(VEHICLE_PURPOSE_LABELS).map(([value, label]) => ({ value, label }))]} searchable={false} showSelectionCheck={false} icon={<Target className="h-4 w-4 text-amber-600" />} className="w-full shrink-0 sm:w-56" />
        <MonthPicker label="Tháng đi" value={filters.month ?? ""} onChange={(value) => change({ month: value || undefined })} allowClear />
        <button type="button" onClick={() => { setFilters({}); setSearch(""); setPage(1); }} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw aria-hidden="true" size={15} />Đặt lại</button>
      </div>

      {data && data.waiting > 0 && (
        <button type="button" onClick={() => change({ status: "pending" })} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800 hover:bg-amber-100">
          Có {data.waiting} chuyến đang chờ HR xử lý hoặc chốt. Bấm để xem các yêu cầu chờ xử lý.
        </button>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {showLoading && !data ? <p role="status" className="p-10 text-center text-sm text-slate-500">Đang tải danh sách chuyến xe…</p>
          : error ? <p role="alert" className="p-8 text-center text-sm text-rose-600">{error}</p>
            : !data?.items.length ? <p className="p-10 text-center text-sm text-slate-500">Không có chuyến xe phù hợp.</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-center text-[13px] text-[#172B24]">
                    <thead className="border-b border-[#f0f3f6] bg-[#eef7f3] text-[14px] font-bold text-[#172B24] [&_th]:font-bold">
                      <tr>{["Giờ đi", "Người đặt", "Mục đích / Khách", "Ngày giờ đặt", "Lộ trình", "Xe", "Trạng thái / Chi phí", "Thao tác"].map((heading) => <th key={heading} className={`px-4 py-3 ${heading === "Thao tác" ? "text-left" : "text-center"}`}>{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((trip) => (
                        <tr key={trip.id} className="align-middle hover:bg-emerald-50">
                          <td className="whitespace-nowrap px-4 py-3 text-center text-[15px] font-bold text-[#111827]">
                            {(() => {
                              const [date, time] = toLocalInput(trip.departAt).split("T");
                              return date && time ? <><span className="block">{date.split("-").reverse().join("/")}</span><span className="mt-1 block">{time}{trip.roundTrip ? " · Khứ hồi" : ""}</span></> : "—";
                            })()}
                          </td>
                          <td className="px-4 py-3"><span className="text-[15px] font-bold text-[#172B24]">{trip.requester.name}</span><span className="block text-xs text-[#64748B]">{trip.requester.department || "—"}</span>{trip.forOther && <span className="mt-0.5 block text-xs font-semibold text-sky-700">Đặt giúp: {trip.forOtherName}</span>}</td>
                          <td className="max-w-52 px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${trip.purpose === "delivery" ? "border-orange-200 bg-orange-50 text-orange-600" : "border-sky-100 bg-sky-100 text-blue-700"}`}>{VEHICLE_PURPOSE_LABELS[trip.purpose]}</span><span className="mt-1 block truncate font-bold text-[#172B24]" title={trip.customerName}>{trip.customerName}</span></td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-700">
                            {trip.createdAt && !Number.isNaN(new Date(trip.createdAt).getTime()) ? (() => {
                              const [date, time] = toLocalInput(trip.createdAt).split("T");
                              return <><span className="block font-semibold">{date.split("-").reverse().join("/")}</span><span className="mt-1 block">{time}</span></>;
                            })() : "—"}
                          </td>
                          <td className="min-w-56 max-w-64 px-4 py-3">
                            <div className="relative grid w-full gap-3 pl-4 text-left text-sm leading-5 before:absolute before:bottom-2.5 before:left-[3px] before:top-2.5 before:border-l before:border-dashed before:border-slate-400">
                              <div className="relative text-slate-700"><span aria-hidden="true" className="absolute -left-4 top-[6px] h-2 w-2 rounded-full border-2 border-emerald-600 bg-white" /><span className="sr-only">Điểm đón: </span><span className="line-clamp-2 break-words">{trip.pickup}</span></div>
                              <div className="relative text-slate-700"><span aria-hidden="true" className="absolute -left-4 top-[6px] h-2 w-2 rounded-full border-2 border-slate-500 bg-white" /><span className="sr-only">Điểm đến: </span><span className="line-clamp-2 break-words">{trip.destination}</span></div>
                              {(trip.extraDestinations?.length ?? 0) > 0 && <span className="text-xs font-semibold text-emerald-700">+{trip.extraDestinations!.length} điểm đến · Xem chi tiết</span>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[15px] font-bold text-[#172B24]">{trip.vehicleType ? VEHICLE_TYPE_LABELS[trip.vehicleType] : <span className="text-amber-700">Chưa chọn</span>}</td>
                          <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[trip.status]}`}>{VEHICLE_STATUS_LABELS[trip.status]}</span><span className="mt-2 block whitespace-nowrap text-slate-700">{trip.vehicleType === "external" ? (trip.actualCost ? <strong>{formatVnd(trip.actualCost)}</strong> : <span title="Giá dự kiến">~ {formatVnd(trip.estimatedCost)}</span>) : "—"}</span></td>
                          <td className="px-4 py-3 text-left align-middle"><button type="button" onClick={() => onOpen(trip)} className={`min-h-10 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold ${trip.status === "pending" ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800" : trip.status === "completed" || trip.status === "cancelled" ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{trip.status === "pending" ? "Xử lý" : trip.status === "arranged" ? "Chỉnh Sửa" : trip.status === "arrived" ? "Hoàn Thành" : "Xem"}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        {data && data.pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
            <span>Trang <span className="font-semibold text-emerald-700">{page}</span> / {totalPages}</span>
            <nav aria-label="Phân trang chuyến xe" className="flex items-center gap-2">
              <button type="button" aria-label="Trang trước" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft aria-hidden="true" size={16} /></button>
              {pageNumbers.map((number, index) => <span key={number} className="contents">{index > 0 && number - pageNumbers[index - 1] > 1 && <span aria-hidden="true" className="px-1 text-slate-400">…</span>}<button type="button" aria-label={`Trang ${number}`} aria-current={page === number ? "page" : undefined} disabled={loading} onClick={() => setPage(number)} className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed ${page === number ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>{number}</button></span>)}
              <button type="button" aria-label="Trang sau" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight aria-hidden="true" size={16} /></button>
            </nav>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><span aria-hidden="true" className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon className="h-7 w-7" /></span><div className="min-w-0"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-1 break-words text-2xl font-extrabold text-slate-900">{value}</p></div></div>;
}

function CostTable({ title, rows, label }: { title: string; rows: VehicleReport["byDepartment"]; label: (name: string) => string }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3>
      {rows.length ? (
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500"><tr><th className="py-1.5 text-left font-semibold">Tên</th><th className="py-1.5 text-right font-semibold">Số chuyến</th><th className="py-1.5 text-right font-semibold">Tiền xe ngoài</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.name}><td className="py-2 text-slate-800">{label(row.name)}</td><td className="py-2 text-right">{row.trips}</td><td className="py-2 text-right font-semibold">{formatVnd(row.cost)}</td></tr>)}</tbody>
        </table>
      ) : <p className="text-sm text-slate-500">Chưa có chuyến xe ngoài nào được chốt.</p>}
    </section>
  );
}

function ReportView() {
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getVehicleReport(month, controller.signal).then((value) => { setReport(value); setError(""); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được báo cáo."); });
    return () => controller.abort();
  }, [month]);
  // While another month loads, the old figures are not shown.
  const totals = report?.month === month ? report.totals : undefined;
  return (
    <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Tổng tiền xe ngoài" value={totals ? formatVnd(totals.externalCost) : "—"} icon={Wallet} tone="bg-emerald-50 text-emerald-600" />
            <Stat label="Chuyến xe ngoài" value={totals?.externalTrips ?? "—"} icon={Car} tone="bg-sky-50 text-sky-600" />
            <Stat label="Chuyến xe công ty" value={totals?.companyTrips ?? "—"} icon={Building2} tone="bg-amber-50 text-amber-600" />
            <Stat label="Đã hoàn thành / Tổng" value={totals ? `${totals.completed} / ${totals.trips}` : "—"} icon={CheckCircle2} tone="bg-violet-50 text-violet-600" />
            <Stat label="Đã hủy" value={totals?.cancelled ?? "—"} icon={XCircle} tone="bg-rose-50 text-rose-600" />
            <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CalendarDays className="h-7 w-7" /></span>
              <div className="min-w-0 flex-1"><p className="mb-2 text-sm font-semibold text-slate-600">Báo Cáo Tháng</p><div className="flex flex-wrap items-center gap-2"><MonthPicker label="Tháng báo cáo" value={month} onChange={setMonth} />
              <a href={vehicleReportExportUrl(month)} download className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"><Download aria-hidden="true" size={16} />Xuất Excel</a></div></div>
            </div>
          </div>
      {totals && totals.notClosed > 0 && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Còn {totals.notClosed} chuyến chưa chốt trong tháng này, chi phí của các chuyến đó chưa được tính.</p>}
      {error ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : !totals ? <p role="status" className="p-6 text-center text-sm text-slate-500">Đang tải báo cáo…</p> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <CostTable title="Theo phòng ban" rows={report!.byDepartment} label={(name) => name} />
            <CostTable title="Theo mục đích" rows={report!.byPurpose} label={(name) => VEHICLE_PURPOSE_LABELS[name as keyof typeof VEHICLE_PURPOSE_LABELS] ?? name} />
          </div>
      )}
    </div>
  );
}

/** HR page: requests to arrange and close, plus the monthly cost report. */
export default function VehicleManagement() {
  const { can } = useAdminPermissions();
  const params = useSearchParams();
  const [tab, setTab] = useState<"trips" | "report">("trips");
  const [selected, setSelected] = useState<VehicleTrip | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Opened from a notification: /admin/vehicles?id=<trip>
  const linkedId = params.get("id");
  useEffect(() => {
    if (!linkedId) return;
    const controller = new AbortController();
    getVehicleTrip(linkedId, controller.signal).then(setSelected).catch(() => undefined);
    return () => controller.abort();
  }, [linkedId]);

  const closeDialog = useCallback(() => {
    setSelected(null);
    if (linkedId) window.history.replaceState(null, "", "/admin/vehicles");
  }, [linkedId]);

  return (
    <div className={`${mediaFont.className} space-y-4 text-[#172B24]`}>
      <div role="tablist" aria-label="Quản lý đặt xe" className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {([["trips", "Danh sách chuyến"], ["report", "Báo cáo chi phí"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === id ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>
        ))}
      </div>
      {tab === "trips" ? <TripsTable onOpen={setSelected} refreshKey={refreshKey} /> : <ReportView />}
      {selected && (
        <VehicleTripDialog
          key={`${selected.id}-${selected.status}`}
          trip={selected}
          canDelete={can("vehicles:delete")}
          onClose={closeDialog}
          onChanged={(trip) => { setSelected(trip); setRefreshKey((value) => value + 1); }}
          onDeleted={() => { closeDialog(); setRefreshKey((value) => value + 1); }}
        />
      )}
    </div>
  );
}
