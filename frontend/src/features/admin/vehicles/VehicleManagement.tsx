"use client";

import { useSearchParams } from "next/navigation";
import { Building2, CalendarDays, Car, Check, ChevronLeft, ChevronRight, CircleDot, Clock3, Download, Eye, Pencil, RotateCcw, Search, Target, Wallet, XCircle, type LucideIcon } from "lucide-react";
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
  REQUESTER_GONE,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  type VehicleListParams,
  type VehicleReport,
  type VehicleStatus,
  type VehicleTrip,
} from "@/services/vehicle.service";
import VehicleTripDialog from "./VehicleTripDialog";
import MonthPicker from "./MonthPicker";
import DatePicker from "@/components/ui/DatePicker";
import { mediaFont } from "@/features/admin/dashboard/media-font";
import { AdminSelect } from "@/features/admin/dashboard/components/AdminSelect";
import { useLiveRefresh } from "@/lib/liveRefresh";

const currentMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date());

const TABLE_STATUS_TONES: Record<VehicleStatus, string> = {
  pending: "bg-[#fef3c7] text-[#92400e]",
  arranged: "bg-[#c5e5ff] text-[#003cda]",
  arrived: "bg-[#ede2ff] text-[#4c16d5]",
  completed: "bg-[#b9f1c9] text-[#166534]",
  cancelled: "bg-[#c7cbd0] text-[#1f2937]",
};
const TRIP_COLUMN_FONT = mediaFont.className;

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
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-wrap items-end gap-x-2.5 gap-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="relative w-full min-w-0 flex-auto sm:min-w-72 sm:flex-1 sm:basis-80">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm theo người đặt hoặc khách hàng…" aria-label="Tìm theo người đặt hoặc khách hàng" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
        </label>
        <AdminSelect value={filters.status ?? ""} onChange={(value) => change({ status: (value || undefined) as VehicleListParams["status"] })} options={[{ value: "", label: "Tất cả trạng thái" }, ...Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => ({ value, label }))]} searchable={false} showSelectionCheck={false} icon={<CircleDot className="h-4 w-4 text-emerald-600" />} className="w-full shrink-0 sm:w-56" />
        <AdminSelect value={filters.vehicleType ?? ""} onChange={(value) => change({ vehicleType: (value || undefined) as VehicleListParams["vehicleType"] })} options={[{ value: "", label: "Tất cả loại xe" }, ...Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} searchable={false} showSelectionCheck={false} icon={<Car className="h-4 w-4 text-sky-600" />} className="w-full shrink-0 sm:w-52" />
        <AdminSelect value={filters.purpose ?? ""} onChange={(value) => change({ purpose: (value || undefined) as VehicleListParams["purpose"] })} options={[{ value: "", label: "Tất cả mục đích" }, ...Object.entries(VEHICLE_PURPOSE_LABELS).map(([value, label]) => ({ value, label }))]} searchable={false} showSelectionCheck={false} icon={<Target className="h-4 w-4 text-amber-600" />} className="w-full shrink-0 sm:w-56" />
        <div role="group" aria-label="Lọc theo ngày đặt đơn" className="flex w-full min-w-0 flex-wrap items-end gap-2 sm:w-[360px] sm:shrink-0">
          <div className="min-w-0 flex-1 basis-40">
            <p className="mb-1 text-xs font-semibold text-slate-600">Từ ngày</p>
            <DatePicker ariaLabel="Từ ngày đặt đơn" value={filters.dateFrom ?? ""} onChange={(value) => change({ dateFrom: value || undefined, dateTo: value && (!filters.dateTo || filters.dateTo < value) ? value : filters.dateTo, month: undefined })} />
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p className="mb-1 text-xs font-semibold text-slate-600">Đến ngày</p>
            <DatePicker ariaLabel="Đến ngày đặt đơn" value={filters.dateTo ?? ""} minValue={filters.dateFrom} onChange={(value) => change({ dateTo: value || undefined, month: undefined })} />
          </div>
        </div>
        <button type="button" onClick={() => { setFilters({}); setSearch(""); setPage(1); }} className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw aria-hidden="true" size={15} />Đặt lại</button>
      </div>

      {data && data.waiting > 0 && (
        <button type="button" onClick={() => change({ status: "pending" })} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800 hover:bg-amber-100">
          Có {data.waiting} yêu cầu đặt xe đang chờ xử lý. Bấm để xem.
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
                      <tr>{["Giờ đi", "Người đặt", "Mục đích / Khách", "Ngày giờ đặt", "Lộ trình", "Xe", "Trạng thái & chi phí", "Thao tác"].map((heading, index) => <th key={heading} className={`px-4 py-3 text-center ${index >= 5 ? `${TRIP_COLUMN_FONT} text-[13px] text-[#111827]` : ""}`}>{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((trip) => {
                        const isClosed = trip.status === "completed" || trip.status === "cancelled";
                        const StatusIcon = trip.status === "pending" || trip.status === "arrived" ? Clock3 : trip.status === "arranged" ? Car : trip.status === "completed" ? Check : XCircle;
                        const ActionIcon = trip.status === "pending" ? Pencil : isClosed ? Eye : Check;
                        const cost = trip.actualCost ?? trip.estimatedCost;
                        return (
                        <tr key={trip.id} className="align-middle hover:bg-emerald-50">
                          <td className="whitespace-nowrap px-4 py-3 text-center text-[15px] font-bold text-[#111827]">
                            {(() => {
                              const [date, time] = toLocalInput(trip.departAt).split("T");
                              return date && time ? <><span className="block">{date.split("-").reverse().join("/")}</span><span className="mt-1 block">{time}{trip.roundTrip ? " · Khứ hồi" : ""}</span></> : "—";
                            })()}
                          </td>
                          <td className="px-4 py-3"><span className="text-[15px] font-bold text-[#172B24]">{trip.requester.name}</span>{trip.requesterStatus && trip.requesterStatus !== "active" && <span className="ml-1.5 inline-flex rounded-full bg-rose-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">{REQUESTER_GONE[trip.requesterStatus]}</span>}<span className="block text-xs text-[#64748B]">{trip.requester.department || "—"}</span>{trip.forOther && <span className="mt-0.5 block text-xs font-semibold text-sky-700">Đặt giúp: {trip.forOtherName}</span>}</td>
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
                          <td className={`${TRIP_COLUMN_FONT} whitespace-nowrap px-4 py-3 text-center text-[13px] font-bold leading-4 text-[#111827]`}>
                            {trip.vehicleType === "external" ? <>Xe ngoài<span className="block">(Grab)</span></> : trip.vehicleType ? VEHICLE_TYPE_LABELS[trip.vehicleType] : <span className="text-amber-700">Chưa chọn</span>}
                          </td>
                          <td className={`${TRIP_COLUMN_FONT} px-4 py-3 text-center text-[13px] leading-4`}>
                            <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold leading-none ${TABLE_STATUS_TONES[trip.status]}`}><StatusIcon aria-hidden="true" size={12} strokeWidth={2.5} />{VEHICLE_STATUS_LABELS[trip.status]}</span>
                            {trip.status === "arrived" && <span className="mt-1 block whitespace-nowrap text-[11px] text-slate-600">Người đặt đã báo đi xong</span>}
                            {trip.status === "pending" ? <span className="mt-1.5 block whitespace-nowrap text-[11px] font-bold text-[#111827]">Chưa cập nhật</span> : trip.vehicleType === "external" ? cost == null ? <span className="mt-1.5 block whitespace-nowrap text-[11px] font-bold text-[#111827]">Chưa cập nhật</span> : <>
                              <span className={`mt-1.5 block text-[11px] ${trip.status === "completed" && trip.actualCost != null ? "text-[#15803d]" : "text-[#111827]"}`}>{trip.status === "cancelled" ? "Chi phí" : trip.actualCost != null ? "Chi phí thực tế" : "Chi phí dự kiến"}</span>
                              <span className="mt-1 block whitespace-nowrap text-[14px] font-bold tabular-nums text-[#111827]">{formatVnd(cost)}</span>
                            </> : <span className="mt-1.5 block text-slate-400">—</span>}
                          </td>
                          <td className={`${TRIP_COLUMN_FONT} px-4 py-3 text-center align-middle`}><button type="button" onClick={() => onOpen(trip)} className={`inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-bold leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${isClosed ? "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:bg-slate-100" : "border-[#a7edbd] bg-[#f3fff6] text-[#14532d] hover:bg-green-100"}`}><ActionIcon aria-hidden="true" size={14} strokeWidth={2.5} />{trip.status === "pending" ? "Xử lý" : isClosed ? "Xem" : "Hoàn thành chuyến"}</button></td>
                        </tr>
                        );
                      })}
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
            {/* One month, the whole company together. Company cars have no cost. */}
            <Stat label="Chuyến xe ngoài" value={totals?.externalTrips ?? "—"} icon={Car} tone="bg-sky-50 text-sky-600" />
            <Stat label="Tiền xe ngoài trong tháng" value={totals ? formatVnd(totals.externalCost) : "—"} icon={Wallet} tone="bg-emerald-50 text-emerald-600" />
            <Stat label="Chuyến xe công ty (không tính tiền)" value={totals?.companyTrips ?? "—"} icon={Building2} tone="bg-amber-50 text-amber-600" />
            <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 sm:col-span-2 lg:col-span-3">
              <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CalendarDays className="h-7 w-7" /></span>
              <div className="min-w-0 flex-1"><p className="mb-2 text-sm font-semibold text-slate-600">Báo Cáo Tháng</p><div className="flex flex-wrap items-center gap-2"><MonthPicker label="Tháng báo cáo" value={month} onChange={setMonth} />
              <a href={vehicleReportExportUrl(month)} download className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"><Download aria-hidden="true" size={16} />Xuất Excel</a></div></div>
            </div>
          </div>
      {totals && totals.notClosed > 0 && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Còn {totals.notClosed} chuyến chưa chốt trong tháng này, chi phí của các chuyến đó chưa được tính.</p>}
      {error ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : !totals ? <p role="status" className="p-6 text-center text-sm text-slate-500">Đang tải báo cáo…</p>
        : <p className="text-xs text-slate-500">Tính theo giờ đi trong tháng, chỉ các chuyến đã chốt hoàn thành. Xe ngoài tính theo giá thật; xe công ty chỉ đếm số chuyến.</p>}
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
  // A new request, an edit or a cancel by the requester: the list updates without reloading the page.
  useLiveRefresh("vehicle-", () => setRefreshKey((value) => value + 1));

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
