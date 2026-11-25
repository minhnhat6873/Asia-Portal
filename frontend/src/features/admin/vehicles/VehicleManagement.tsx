"use client";

import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAdminPermissions } from "@/lib/adminPermissions";
import { useDelayedLoading } from "@/lib/useDelayedLoading";
import {
  formatTripTime,
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

const SELECT = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500";
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
      listVehicleTrips({ ...filters, search: search.trim() || undefined, page, limit: 20 }, controller.signal)
        .then((result) => { setData(result); setError(""); })
        .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được danh sách chuyến xe."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [filters, search, page, refreshKey]);

  const change = (next: VehicleListParams) => { setFilters((current) => ({ ...current, ...next })); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="relative min-w-0 flex-1 basis-60">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm khách hàng, người đặt, địa điểm…" aria-label="Tìm chuyến xe" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
        </label>
        <select aria-label="Trạng thái" value={filters.status ?? ""} onChange={(event) => change({ status: (event.target.value || undefined) as VehicleListParams["status"] })} className={SELECT}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Loại xe" value={filters.vehicleType ?? ""} onChange={(event) => change({ vehicleType: (event.target.value || undefined) as VehicleListParams["vehicleType"] })} className={SELECT}>
          <option value="">Tất cả loại xe</option>
          {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Mục đích" value={filters.purpose ?? ""} onChange={(event) => change({ purpose: (event.target.value || undefined) as VehicleListParams["purpose"] })} className={SELECT}>
          <option value="">Tất cả mục đích</option>
          {Object.entries(VEHICLE_PURPOSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input type="month" aria-label="Tháng đi" value={filters.month ?? ""} onChange={(event) => change({ month: event.target.value || undefined })} className={SELECT} />
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
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>{["Giờ đi", "Người đặt", "Mục đích / Khách", "Lộ trình", "Xe", "Chi phí", "Trạng thái", ""].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((trip) => (
                        <tr key={trip.id} className="align-top hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{formatTripTime(trip.departAt)}{trip.roundTrip && <span className="block text-xs font-normal text-slate-500">Khứ hồi</span>}</td>
                          <td className="px-4 py-3"><span className="font-semibold text-slate-800">{trip.requester.name}</span><span className="block text-xs text-slate-500">{trip.requester.department || "—"}</span>{trip.forOther && <span className="mt-0.5 block text-xs font-semibold text-sky-700">Đặt giúp: {trip.forOtherName}</span>}</td>
                          <td className="max-w-52 px-4 py-3"><span className="text-xs font-semibold text-slate-500">{VEHICLE_PURPOSE_LABELS[trip.purpose]}</span><span className="block truncate font-semibold text-slate-800" title={trip.customerName}>{trip.customerName}</span></td>
                          <td className="max-w-64 px-4 py-3 text-slate-600"><span className="line-clamp-2">{trip.pickup} → {trip.destination}</span></td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{trip.vehicleType ? VEHICLE_TYPE_LABELS[trip.vehicleType] : <span className="text-amber-700">Chưa chọn</span>}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{trip.vehicleType === "external" ? (trip.actualCost ? <strong>{formatVnd(trip.actualCost)}</strong> : <span title="Giá dự kiến">~ {formatVnd(trip.estimatedCost)}</span>) : "—"}</td>
                          <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VEHICLE_STATUS_TONES[trip.status]}`}>{VEHICLE_STATUS_LABELS[trip.status]}</span></td>
                          <td className="px-4 py-3 text-right"><button type="button" onClick={() => onOpen(trip)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Xử lý</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>Trang {data.pagination.page}/{data.pagination.totalPages} · {data.pagination.total} chuyến</span>
            <div className="flex gap-2">
              <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft aria-hidden="true" size={16} /></button>
              <button type="button" aria-label="Trang sau" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight aria-hidden="true" size={16} /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${strong ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-xl font-extrabold ${strong ? "text-emerald-800" : "text-slate-900"}`}>{value}</p></div>;
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
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Tháng<input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} className={SELECT} /></label>
        <a href={vehicleReportExportUrl(month)} download className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"><Download aria-hidden="true" size={16} />Xuất Excel</a>
      </div>
      {error ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : !totals ? <p role="status" className="p-6 text-center text-sm text-slate-500">Đang tải báo cáo…</p> : (
        <>
          {totals.notClosed > 0 && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Còn {totals.notClosed} chuyến chưa chốt trong tháng này, chi phí của các chuyến đó chưa được tính.</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Tổng tiền xe ngoài" value={formatVnd(totals.externalCost)} strong />
            <Stat label="Chuyến xe ngoài" value={totals.externalTrips} />
            <Stat label="Chuyến xe công ty" value={totals.companyTrips} />
            <Stat label="Đã hoàn thành / Tổng" value={`${totals.completed} / ${totals.trips}`} />
            <Stat label="Đã hủy" value={totals.cancelled} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CostTable title="Theo phòng ban" rows={report!.byDepartment} label={(name) => name} />
            <CostTable title="Theo mục đích" rows={report!.byPurpose} label={(name) => VEHICLE_PURPOSE_LABELS[name as keyof typeof VEHICLE_PURPOSE_LABELS] ?? name} />
          </div>
        </>
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
    <div className="space-y-4">
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
