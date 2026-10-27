"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useDelayedLoading } from "@/lib/useDelayedLoading";
import { createPortal } from "react-dom";
import {
  CalendarDays, CalendarRange, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, Filter, List,
  LoaderCircle, Mail, MapPin, Pencil, Plus, Printer, RotateCcw, Search, Trash2, UsersRound, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAdminMeeting, deleteAdminMeeting, getAdminMeeting, getAdminMeetingRequests,
  getAdminMeetings, revokeAdminMeetingRequest, updateAdminMeeting,
  type AdminMeeting, type AdminMeetingInput, type AdminMeetingTab, type MeetingFilters, type MeetingRequest,
  type MeetingStatus,
} from "@/services/admin-meeting.service";
import { ApiError } from "@/services/api";
import { getMeetingDepartmentName } from "@/config/meetingDepartments";
import MeetingDepartmentSelect from "@/components/ui/MeetingDepartmentSelect";
import { getFutureMeetingTimes, getMeetingDurationOptions, getNextMeetingSlot, getVietnamBookingNow } from "@/lib/meetingSchedule";

const ROOMS = [
  { id: "room-01" as const, name: "Phòng 1", capacity: 12, image: "/assets/images/Phonghop1.jpg" },
  { id: "room-02" as const, name: "Phòng 2", capacity: 6, image: "/assets/images/phonghop2.jpg" },
];
const TABS: { id: AdminMeetingTab; label: string }[] = [
  { id: "active", label: "Lịch họp" },
  { id: "history", label: "Lịch sử" },
];
const PAGE_SIZE = 10;

function isoToday() {
  return getVietnamBookingNow().date;
}
function addDays(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function weekStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  return addDays(value, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
}
function formatDate(value?: string) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}
function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? formatDate(value) : new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(date);
}
function roomLabel(roomId?: string) { return ROOMS.find(({ id }) => id === roomId)?.name ?? "—"; }
function statusLabel(status?: MeetingStatus) {
  return status === "ongoing" ? "Đang họp" : status === "ended" ? "Đã kết thúc" : "Sắp tới";
}
function statusClass(status?: MeetingStatus) {
  return status === "ongoing" ? "bg-rose-50 text-rose-700 ring-rose-100" : status === "ended" ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-blue-50 text-blue-700 ring-blue-100";
}
function statusDot(status?: MeetingStatus) {
  return status === "ongoing" ? "bg-rose-500" : status === "ended" ? "bg-slate-400" : "bg-blue-500";
}
function initial(name: string) { return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function retentionDate(meeting: AdminMeeting) {
  return new Date(meetingEndTimestamp(meeting) + 15 * 24 * 60 * 60 * 1000).toISOString();
}
function meetingEndTimestamp(meeting: AdminMeeting) {
  const [year, month, day] = meeting.date.split("-").map(Number);
  const [hour, minute] = meeting.end.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour - 7, minute);
}
function liveStatus(meeting: AdminMeeting, now: number): MeetingStatus {
  const [year, month, day] = meeting.date.split("-").map(Number);
  const [startHour, startMinute] = meeting.start.split(":").map(Number);
  const start = Date.UTC(year, month - 1, day, startHour - 7, startMinute);
  const end = meetingEndTimestamp(meeting);
  return now < start ? "upcoming" : now < end ? "ongoing" : "ended";
}
function dateRangeLabel(from: string, to: string) { return `${formatDate(from)} – ${formatDate(to)}`; }
function escapePrint(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
function printMeetingReport(meetings: AdminMeeting[], range: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const printDocument = frame.contentDocument;
  const printWindow = frame.contentWindow;
  if (!printDocument || !printWindow) { frame.remove(); toast.error("Không thể mở bản in trên trình duyệt này."); return; }
  const rows = meetings.map((meeting, index) => `<tr><td>${index + 1}</td><td>${escapePrint(meeting.title)}</td><td>${escapePrint(roomLabel(meeting.roomId))}</td><td>${escapePrint(formatDate(meeting.date))}<br>${escapePrint(meeting.start)}–${escapePrint(meeting.end)}</td><td>${escapePrint(meeting.organizer)}</td><td>${escapePrint(meeting.department)}</td></tr>`).join("");
  printDocument.open();
  printDocument.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Lịch họp</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#17212b}.head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #087b49;padding-bottom:10px}.head img{width:48px;height:48px;object-fit:contain}.brand{font-weight:700;color:#07553d;font-size:15px}.sub{font-size:10px;color:#64748b;margin-top:4px}h1{font-size:20px;margin:20px 0 5px;color:#123b30}.range{color:#526176;margin-bottom:14px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left;vertical-align:top}th{background:#f0f7f4;color:#07553d}td:first-child{width:28px;text-align:center}.empty{text-align:center;padding:24px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header class="head"><img src="${escapePrint(new URL("/assets/images/asia-logo.png", window.location.origin).href)}" alt="Asia F&B"><div><div class="brand">Asia F&amp;B Beverage</div><div class="sub">LỊCH HỌP / LỊCH ĐẶT PHÒNG</div></div></header><h1>LỊCH HỌP / LỊCH ĐẶT PHÒNG</h1><p class="range">Khoảng ngày: ${escapePrint(range)} · ${meetings.length} cuộc họp</p><table><thead><tr><th>#</th><th>Tiêu đề</th><th>Phòng họp</th><th>Ngày &amp; giờ</th><th>Người chủ trì</th><th>Phòng ban</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">Không có lịch họp phù hợp.</td></tr>'}</tbody></table></body></html>`);
  printDocument.close();
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; window.setTimeout(() => frame.remove(), 0); };
  printWindow.onafterprint = cleanup;
  const logo = printDocument.querySelector<HTMLImageElement>("img");
  const runPrint = () => { try { printWindow.focus(); printWindow.print(); } catch { cleanup(); toast.error("Không thể in lịch trên trình duyệt này."); } };
  if (logo && !logo.complete) { logo.onload = runPrint; logo.onerror = runPrint; window.setTimeout(runPrint, 1200); }
  else runPrint();
  window.setTimeout(cleanup, 60_000);
}

interface Props { permissions: string[]; }

export function MeetingManagement({ permissions }: Props) {
  const [tab, setTab] = useState<AdminMeetingTab>("active");
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roomId, setRoomId] = useState<MeetingFilters["roomId"]>();
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<MeetingStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageData, setPageData] = useState<{ items: AdminMeeting[] | MeetingRequest[]; pagination: { total: number; totalPages: number } }>({ items: [], pagination: { total: 0, totalPages: 0 } });
  const [calendarMeetings, setCalendarMeetings] = useState<AdminMeeting[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const showCalendarLoading = useDelayedLoading(calendarLoading);
  const [error, setError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [view, setView] = useState<"table" | "week">("table");
  const [selectedDate, setSelectedDate] = useState(isoToday);
  const [month, setMonth] = useState(() => isoToday().slice(0, 7));
  const [selectedMeeting, setSelectedMeeting] = useState<AdminMeeting | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminMeeting | null>(null);
  const [formTarget, setFormTarget] = useState<AdminMeeting | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [requestDeleteId, setRequestDeleteId] = useState("");
  const canCreate = permissions.includes("meetings:create");
  const canUpdate = permissions.includes("meetings:update");
  const canDelete = permissions.includes("meetings:delete");

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const meetingFilters = useMemo(() => {
    const filters: MeetingFilters = {
      search: debouncedSearch || undefined, roomId, department: department || undefined,
      status: status || undefined, sort: sortOrder,
    };
    if (view === "week" && (tab === "active" || tab === "history")) {
      const from = weekStart(selectedDate);
      filters.dateFrom = from;
      filters.dateTo = addDays(from, 5);
    } else {
      filters.dateFrom = dateFrom || undefined;
      filters.dateTo = dateTo || undefined;
    }
    if (tab === "active") filters.source = "active";
    if (tab === "history") filters.source = "history";
    return filters;
  }, [debouncedSearch, roomId, department, status, dateFrom, dateTo, view, selectedDate, tab, sortOrder]);

  const reload = useCallback(() => setRefreshToken((current) => current + 1), []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setShowLoading(false);
    const loadingTimer = window.setTimeout(() => setShowLoading(true), 1000);
    setError("");
    const request = tab === "pending"
      ? getAdminMeetingRequests("pending", page, PAGE_SIZE, controller.signal)
      : tab === "cancellations"
        ? getAdminMeetingRequests("cancel-requests", page, PAGE_SIZE, controller.signal)
        : getAdminMeetings({ ...meetingFilters, page: view === "week" ? 1 : page, limit: view === "week" ? 500 : pageSize }, controller.signal);
    void request.then((result) => { if (!controller.signal.aborted) setPageData(result); }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setPageData({ items: [], pagination: { total: 0, totalPages: 0 } });
        setError(cause instanceof Error ? cause.message : "Không thể tải danh sách lịch họp.");
      }
    }).finally(() => {
      window.clearTimeout(loadingTimer);
      if (!controller.signal.aborted) { setLoading(false); setShowLoading(false); }
    });
    return () => { controller.abort(); window.clearTimeout(loadingTimer); };
  }, [meetingFilters, tab, page, pageSize, view, refreshToken]);


  useEffect(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = `${month}-01`;
    const last = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
    const controller = new AbortController();
    setCalendarLoading(true);
    setCalendarError("");
    void getAdminMeetings({ status: status || undefined, dateFrom: first, dateTo: last, roomId, department: department || undefined, limit: 500, page: 1, sort: sortOrder }, controller.signal)
      .then((result) => { setCalendarMeetings(result.items); setDepartments((current) => [...new Set([...current, ...result.items.map((item) => item.department)])].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"))); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setCalendarMeetings([]); setCalendarError(cause instanceof Error ? cause.message : "Không thể tải lịch tháng."); } })
      .finally(() => { if (!controller.signal.aborted) setCalendarLoading(false); });
    return () => controller.abort();
  }, [month, roomId, department, status, sortOrder, refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    void getAdminMeetings({ source: "active", limit: 500, page: 1 }, controller.signal)
      .then((result) => setDepartments((current) => [...new Set([...current, ...result.items.map((item) => item.department)])].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"))))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const resetFilters = () => {
    setSearch(""); setDebouncedSearch(""); setRoomId(undefined); setDepartment(""); setStatus(""); setDateFrom(""); setDateTo(""); setPage(1); setSortOrder("asc"); setSelectedDate(isoToday());
  };

  const openDetails = async (meeting: AdminMeeting) => {
    setSelectedMeeting(meeting);
    setDetailLoading(true);
    try { setSelectedMeeting(await getAdminMeeting(meeting.id)); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Không thể tải chi tiết cuộc họp."); }
    finally { setDetailLoading(false); }
  };

  const removeMeeting = async () => {
    const meeting = deleteTarget;
    if (!canDelete || !meeting) return;
    setDeletingId(meeting.id);
    try {
      await deleteAdminMeeting(meeting.id);
      toast.success("Đã xóa lịch họp.");
      setSelectedMeeting(null);
      setDeleteTarget(null);
      reload();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.status === 404 ? "Lịch này đã bị xóa hoặc không còn tồn tại. Danh sách đã được làm mới." : cause.status === 409 ? `Lịch vừa được thay đổi. ${cause.message}` : cause.message : "Không thể xóa lịch họp.");
      if (cause instanceof ApiError && (cause.status === 404 || cause.status === 409)) { setDeleteTarget(null); reload(); }
    }
    finally { setDeletingId(""); }
  };

  const saveMeeting = async (input: AdminMeetingInput) => {
    if (saving) return;
    setSaving(true);
    try {
      if (formTarget) await updateAdminMeeting(formTarget.id, formTarget.status === "ongoing"
        ? { title: input.title, organizer: input.organizer, email: input.email, department: input.department }
        : input);
      else await createAdminMeeting(input);
      toast.success(formTarget ? "Đã cập nhật lịch họp." : "Đã thêm lịch họp.");
      setFormOpen(false);
      setFormTarget(null);
      reload();
    } catch (cause) {
      if (cause instanceof ApiError) {
        const message = cause.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : cause.status === 403 ? "Bạn chưa được cấp quyền quản lý lịch họp." : cause.status === 404 ? "Lịch không còn tồn tại. Danh sách đã được làm mới." : cause.status === 409 ? `Lịch vừa thay đổi hoặc khung giờ đã được đặt. ${cause.message}` : cause.message;
        toast.error(message);
        if (cause.status === 404 || (cause.status === 409 && /lịch sử|chuyển vào|kết thúc/i.test(cause.message))) {
          setFormOpen(false);
          setFormTarget(null);
          reload();
        }
      } else toast.error("Không thể lưu lịch họp. Vui lòng thử lại.");
      throw cause;
    } finally { setSaving(false); }
  };

  const revokeRequest = async (request: MeetingRequest, kind: "pending" | "cancel-requests") => {
    if (!canDelete || !window.confirm("Thu hồi yêu cầu này? Người dùng không thể tiếp tục xác thực.")) return;
    setRequestDeleteId(request.id);
    try { await revokeAdminMeetingRequest(kind, kind === "pending" ? request.id : request.bookingId ?? request.id); toast.success("Đã thu hồi yêu cầu."); reload(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Không thể thu hồi yêu cầu."); }
    finally { setRequestDeleteId(""); }
  };

  const selectCalendarDate = (day: string) => { setMonth(day.slice(0, 7)); setSelectedDate(day); setDateFrom(day); setDateTo(day); setPage(1); };
  const pageItems = pageData.items;
  const weekFrom = weekStart(selectedDate);
  const weekTo = addDays(weekFrom, 5);
  const weekDays = Array.from({ length: 6 }, (_, index) => addDays(weekFrom, index));
  const monthDays = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
    const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - mondayOffset + 1;
      const date = new Date(Date.UTC(year, monthNumber - 1, day));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    }).map((value) => ({ value, inMonth: value.slice(0, 7) === month }));
  }, [month]);
  const calendarCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const meeting of calendarMeetings) counts.set(meeting.date, (counts.get(meeting.date) ?? 0) + 1);
    return counts;
  }, [calendarMeetings]);
  const weekMeetings = useMemo(() => calendarMeetings.filter((meeting) => meeting.date >= weekFrom && meeting.date <= weekTo).sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)), [calendarMeetings, weekFrom, weekTo]);
  const weekStats = [
    { label: "Cuộc họp", value: weekMeetings.length, icon: CalendarDays },
    { label: "Phòng ban đặt", value: new Set(weekMeetings.map((meeting) => meeting.department).filter(Boolean)).size, icon: UsersRound },
    { label: "Phòng 1", value: weekMeetings.filter((meeting) => meeting.roomId === "room-01").length, icon: MapPin },
    { label: "Phòng 2", value: weekMeetings.filter((meeting) => meeting.roomId === "room-02").length, icon: MapPin },
  ];
  const totalPages = Math.max(pageData.pagination.totalPages || 1, 1);
  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() => document.getElementById("admin-meeting-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (page <= 2) return [1, 2, 3, 4, "end-gap", totalPages] as const;
    if (page === 3) return [1, 2, 3, 4, 5, "end-gap", totalPages] as const;
    if (page >= totalPages - 2) return [1, "start-gap", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    return [1, 2, "middle-gap", page, page + 1] as const;
  }, [page, totalPages]);


  const printCurrentSchedule = async () => {
    if (view === "week") { printMeetingReport(weekMeetings, dateRangeLabel(weekFrom, weekTo)); return; }
    if (tab !== "active" && tab !== "history") { toast.info("Bản in chỉ áp dụng cho danh sách lịch họp."); return; }
    try {
      const first = await getAdminMeetings({ ...meetingFilters, page: 1, limit: 500 });
      const pages = await Promise.all(Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, index) => getAdminMeetings({ ...meetingFilters, page: index + 2, limit: 500 })));
      const meetings = [...first.items, ...pages.flatMap((result) => result.items)];
      const range = dateFrom && dateTo ? dateRangeLabel(dateFrom, dateTo) : dateFrom ? `Từ ${formatDate(dateFrom)}` : dateTo ? `Đến ${formatDate(dateTo)}` : "Tất cả ngày";
      printMeetingReport(meetings, range);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Không thể tải lịch để in."); }
  };

  return <div className="space-y-4 pb-6 print:space-y-0">
    <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div className="flex items-start gap-3"><span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CalendarDays size={22} /></span><div><h1 className="text-[25px] font-extrabold leading-7 tracking-tight text-[#07553d]">Quản lý lịch họp</h1><p className="mt-0.5 text-sm text-slate-500">Quản trị, theo dõi và cập nhật toàn bộ lịch họp trong hệ thống</p></div></div>
    </div>

    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-busy={calendarLoading} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-slate-900">Lịch tháng {Number(month.slice(5))}, {month.slice(0, 4)}</h2><div className="flex gap-1"><button type="button" aria-label="Tháng trước" onClick={() => setMonth(addDays(`${month}-01`, -1).slice(0, 7))} className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><ChevronLeft size={16} /></button><button type="button" aria-label="Tháng sau" onClick={() => setMonth(addDays(`${month}-28`, 10).slice(0, 7))} className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><ChevronRight size={16} /></button></div></div>
          {showCalendarLoading && <span role="status" className="pointer-events-none absolute right-24 top-5 text-emerald-700"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Đang tải lịch…</span></span>}
          {calendarError && <p role="alert" className="absolute inset-x-4 bottom-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-600">{calendarError}</p>}
          <>
            <div className="mt-2 grid grid-cols-7 text-center text-sm font-semibold text-slate-500">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
            <div className="grid grid-cols-7">
              {monthDays.map(({ value, inMonth }) => {
                const count = calendarCount.get(value) ?? 0;
                const selected = value === selectedDate;
                const inSelectedWeek = value >= weekFrom && value <= weekTo;
                const isFirstWeekday = value === weekFrom;
                const isLastWeekday = value === weekTo;
                return <div key={value} className={`relative flex h-7 items-center justify-center ${inSelectedWeek ? `bg-[#eaf8ef] ${isFirstWeekday ? "rounded-l-full" : ""} ${isLastWeekday ? "rounded-r-full" : ""}` : ""}`}>
                  <button type="button" onClick={() => selectCalendarDate(value)} aria-label={`${formatDate(value)}${count ? `, ${count} cuộc họp` : ""}`} aria-pressed={selected} className={`grid h-7 w-7 place-items-center rounded-full text-sm transition ${selected ? "bg-emerald-700 font-bold text-white shadow-sm" : inMonth ? "text-slate-700 hover:bg-emerald-100" : "text-slate-300 hover:bg-slate-50"}`}>{Number(value.slice(-2))}</button>
                  {count ? <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-emerald-500"}`} /> : null}
                </div>;
              })}
            </div>
          </>
        </section>
        <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_4px_18px_rgba(12,91,63,0.045)] print:hidden sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-[#102c4e]">Thống kê tuần này</h2><p className="mt-0.5 text-sm text-slate-500">{dateRangeLabel(weekFrom, weekTo)}</p></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5">{weekStats.map(({ label, value, icon: Icon }) => <article key={label} className="flex min-h-[82px] min-w-0 items-center gap-2.5 rounded-xl bg-[#f3f7ff] p-2.5 sm:gap-3.5 sm:p-3.5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-100 bg-white text-emerald-600 shadow-sm"><Icon size={22} /></span><div className="min-w-0"><p className="text-2xl font-extrabold leading-none text-slate-950">{value}</p><p className="mt-1 truncate text-sm text-slate-500">{label}</p></div></article>)}</div>
        </section>
      </div>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-3 sm:p-3.5 print:hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100"><Search size={16} className="shrink-0 text-emerald-700" /><input aria-label="Tìm lịch họp" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề, người đặt lịch..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /></label>
            <button type="button" onClick={resetFilters} className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"><RotateCcw size={14} />Đặt lại</button>
            <button type="button" disabled={!canCreate} title={canCreate ? "Thêm lịch họp" : "Bạn chưa có quyền thêm lịch"} onClick={() => { setFormTarget(null); setFormOpen(true); }} className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} />Thêm lịch họp</button>
          </div>
          </div>
          <div id="admin-meeting-results" className="scroll-mt-6 border-t border-slate-100">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="relative justify-self-start lg:justify-self-start">
              <button type="button" aria-expanded={isTabMenuOpen} aria-haspopup="menu" onClick={() => setIsTabMenuOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-extrabold text-slate-900 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><span>Danh sách {tab === "history" ? "Lịch sử" : tab === "cancellations" ? "Lịch hủy" : "Lịch họp"}</span>{tab === "active" || tab === "history" ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold leading-none text-slate-600">{pageData.pagination.total}</span> : null}<ChevronDown size={15} className={`text-emerald-700 transition-transform ${isTabMenuOpen ? "rotate-180" : ""}`} /></button>
              {isTabMenuOpen ? <div role="menu" aria-label="Danh sách lịch họp" className="absolute left-0 top-full z-40 mt-2 grid min-w-52 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{TABS.filter((item) => item.id === "active" || item.id === "history").map((item) => <button key={item.id} type="button" role="menuitemradio" aria-checked={tab === item.id} onClick={() => { setTab(item.id); setPage(1); setIsTabMenuOpen(false); }} className={`inline-flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${tab === item.id ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"}`}><CalendarDays size={16} /><span className="flex-1">{item.label}</span>{tab === item.id ? <Check size={15} className="text-emerald-700" /> : null}</button>)}</div> : null}
            </div>
            <div className="inline-flex whitespace-nowrap justify-self-end rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={() => setView("table")} aria-pressed={view === "table"} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${view === "table" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><List size={15} />Xem theo bảng</button><button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setView("week"); setPage(1); }} aria-pressed={view === "week"} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${view === "week" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}><CalendarRange size={15} />Lịch tuần</button></div>
          </div>

          {view === "week" && (tab === "active" || tab === "history") ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-bold text-slate-800">Lịch tuần</p><p className="text-sm text-slate-500">{dateRangeLabel(weekFrom, weekTo)}</p></div><div className="flex items-center gap-1"><button type="button" aria-label="Tuần trước" onClick={() => { setSelectedDate(addDays(weekFrom, -7)); setPage(1); }} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} /></button><input aria-label="Chọn tuần bắt đầu từ thứ Hai" type="date" value={weekFrom} onChange={(event) => event.target.value && setSelectedDate(weekStart(event.target.value))} className="h-8 rounded-lg border border-slate-200 px-2 text-sm text-slate-700" /><button type="button" aria-label="Tuần sau" onClick={() => { setSelectedDate(addDays(weekFrom, 7)); setPage(1); }} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button></div></div> : null}

          {(tab === "active" || tab === "history") && view === "week" ? error ? <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p className="font-bold">Không thể tải dữ liệu</p><p className="mt-1">{error}</p><button type="button" onClick={reload} className="mt-3 font-bold underline">Thử lại</button></div> : <div aria-busy={loading} inert={loading}>{showLoading ? <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-emerald-700" />Đang tải lịch họp...</div> : <WeekSchedule meetings={(pageItems as AdminMeeting[]).map((meeting) => ({ ...meeting, status: liveStatus(meeting, clock) }))} days={weekDays} onSelect={openDetails} />}</div> : <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead className="bg-[#f3f7f9] text-sm font-bold tracking-wide text-slate-600"><tr>{tab === "pending" ? <><th className="px-4 py-3">Tiêu đề</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phòng</th><th className="px-4 py-3">Ngày &amp; giờ</th><th className="px-4 py-3">Hết hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-center">Thao tác</th></> : tab === "cancellations" ? <><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Thời gian yêu cầu</th><th className="px-4 py-3">Hết hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-center">Thao tác</th></> : tab === "history" ? <><th className="px-4 py-3">Tiêu đề</th><th className="px-4 py-3">Phòng</th><th className="px-4 py-3">Ngày &amp; giờ</th><th className="px-4 py-3">Người chủ trì</th><th className="px-4 py-3">Kết thúc</th><th className="px-4 py-3">Tự xóa sau</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-center">Thao tác</th></> : <><th className="px-4 py-3">Tiêu đề</th><th className="px-4 py-3">Phòng</th><th className="px-4 py-3">Phòng ban</th><th className="px-4 py-3">Người chủ trì</th><th className="px-4 py-3">Email</th><th className="px-4 py-3"><button type="button" onClick={() => { setSortOrder((value) => value === "asc" ? "desc" : "asc"); setPage(1); }}>Ngày &amp; giờ <span aria-hidden="true">{sortOrder === "asc" ? "↑" : "↓"}</span></button></th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-center">Thao tác</th></>}</tr></thead>
              <tbody aria-busy={loading} inert={loading} className="divide-y divide-slate-100">
                {error ? <tr><td colSpan={tab === "pending" ? 7 : tab === "cancellations" ? 6 : tab === "history" ? 8 : 9} className="px-4 py-16"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p className="font-bold">Không thể tải dữ liệu</p><p className="mt-1">{error}</p><button type="button" onClick={reload} className="mt-3 font-bold underline">Thử lại</button></div></td></tr> : showLoading || (loading && pageItems.length === 0) ? <tr><td colSpan={tab === "pending" ? 7 : tab === "cancellations" ? 6 : tab === "history" ? 8 : 9} className="h-64 px-4 text-center">{showLoading ? <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-emerald-700" />Đang tải lịch họp...</span> : <span className="sr-only">Đang cập nhật kết quả</span>}</td></tr> : pageItems.length === 0 ? <tr><td colSpan={tab === "pending" ? 7 : tab === "cancellations" ? 6 : tab === "history" ? 8 : 9} className="px-4 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CalendarDays size={22} /></span><p className="mt-3 text-sm font-bold text-slate-700">{emptyLabel(tab)}</p><p className="mt-1 text-sm text-slate-400">Thử điều chỉnh bộ lọc hoặc chọn khoảng ngày khác.</p></td></tr> : pageItems.map((entry) => {
                  if (tab === "pending") { const request = entry as MeetingRequest; return <tr key={request.id} className="hover:bg-emerald-50/30"><td className="max-w-[230px] px-4 py-3 font-bold text-slate-800"><span className="block truncate">{request.title ?? "Yêu cầu đặt phòng"}</span><span className="mt-1 block text-sm font-normal text-slate-400">{request.organizer ?? "—"}</span></td><td className="px-4 py-3 text-slate-600">{request.email}</td><td className="px-4 py-3 text-slate-600">{roomLabel(request.roomId)}</td><td className="px-4 py-3 leading-5 text-slate-600">{formatDate(request.date)}<br />{request.start ?? "—"}{request.end ? ` – ${request.end}` : ""}</td><td className="px-4 py-3 text-slate-600">{formatDateTime(request.otpExpiresAt)}</td><td className="px-4 py-3"><StatusPill expired={request.expired} /></td><td className="px-4 py-3 text-center"><RequestActions canDelete={canDelete} busy={requestDeleteId === request.id} onRevoke={() => void revokeRequest(request, "pending")} /></td></tr>; }
                  if (tab === "cancellations") { const request = entry as MeetingRequest; return <tr key={request.id} className="hover:bg-emerald-50/30"><td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">{request.bookingId ?? "—"}</td><td className="px-4 py-3 text-slate-600">{request.email}</td><td className="px-4 py-3 text-slate-600">{formatDateTime(request.createdAt)}</td><td className="px-4 py-3 text-slate-600">{formatDateTime(request.otpExpiresAt)}</td><td className="px-4 py-3"><StatusPill expired={request.expired} /></td><td className="px-4 py-3 text-center"><RequestActions canDelete={canDelete} busy={requestDeleteId === request.id} onRevoke={() => void revokeRequest(request, "cancel-requests")} /></td></tr>; }
                  const meeting = entry as AdminMeeting;
                  const currentStatus = liveStatus(meeting, clock);
                  const isHistory = tab === "history";
                  return <tr key={meeting.id} className="transition-colors hover:bg-emerald-50/40"><td className="max-w-[210px] px-4 py-3 font-bold text-slate-800"><span className="block truncate">{meeting.title}</span>{isHistory ? <span className="mt-1 block text-sm font-normal text-slate-400">Email: {meeting.email}</span> : null}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{roomLabel(meeting.roomId)}</td>{isHistory ? <><td className="whitespace-nowrap px-4 py-3 leading-5 text-slate-600">{formatDate(meeting.date)}<br />{meeting.start} – {meeting.end}</td><td className="px-4 py-3 text-slate-600">{meeting.organizer}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(new Date(meetingEndTimestamp(meeting)).toISOString())}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(retentionDate(meeting))}</td></> : <><td className="px-4 py-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-600">{meeting.department}</span></td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-slate-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-800">{initial(meeting.organizer)}</span>{meeting.organizer}</span></td><td className="px-4 py-3 text-slate-500">{meeting.email}</td><td className="whitespace-nowrap px-4 py-3 leading-5 text-slate-600">{formatDate(meeting.date)}<br /><span className="text-sm text-slate-400">{meeting.start} – {meeting.end}</span></td><td className="px-4 py-3"><span className="whitespace-nowrap rounded-lg bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-700">{meeting.source === "history" ? "Lịch sử" : "Đang hoạt động"}</span></td></> }<td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-bold ring-1 ring-inset ${statusClass(currentStatus)}`}><span className={`mr-1.5 mt-1 h-1.5 w-1.5 rounded-full ${statusDot(currentStatus)}`} />{statusLabel(currentStatus)}</span></td><td className="px-3 py-3"><div className="flex items-center justify-center gap-1"><button type="button" title="Xem chi tiết" aria-label={`Xem ${meeting.title}`} onClick={() => void openDetails(meeting)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700"><Eye size={16} /></button>{!isHistory && canUpdate ? <button type="button" title="Chỉnh sửa lịch" aria-label="Chỉnh sửa lịch" onClick={() => { setFormTarget(meeting); setFormOpen(true); }} className="grid h-8 w-8 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50"><Pencil size={15} /></button> : null}{canDelete ? <button type="button" disabled={deletingId === meeting.id} title={isHistory ? "Xóa vĩnh viễn" : "Xóa lịch"} aria-label={`Xóa ${meeting.title}`} onClick={() => setDeleteTarget(meeting)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={15} /></button> : null}</div></td></tr>;
                })}
              </tbody>
            </table>
          </div>}

          {!error && view === "table" ? <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-500">
            <span className="text-sm font-medium text-slate-600">Trang <strong className="text-emerald-700">{page}</strong> / {totalPages}</span>
            <div className="ml-auto flex items-center gap-2">
              <nav aria-label="Phân trang lịch họp" className="flex items-center gap-1.5">
                <button type="button" aria-label="Trang trước" disabled={loading || page <= 1} onClick={() => goToPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40"><ChevronLeft size={15} /></button>
                {paginationItems.map((item, index) => typeof item === "string" ? <span key={`${item}-${index}`} aria-hidden="true" className="min-w-5 text-center text-sm text-slate-400">…</span> : <button key={item} type="button" aria-current={page === item ? "page" : undefined} disabled={loading} onClick={() => goToPage(item)} className={`grid h-9 min-w-9 place-items-center rounded-full border px-2 text-sm font-semibold shadow-sm transition ${page === item ? "border-emerald-700 bg-emerald-700 text-white shadow-emerald-900/15" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`}>{item}</button>)}
                <button type="button" aria-label="Trang sau" disabled={loading || page >= totalPages} onClick={() => goToPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40"><ChevronRight size={15} /></button>
              </nav>
            </div>
          </footer> : null}
          </div>
        </section>
      </div>

    {selectedMeeting ? <MeetingDetails meeting={{ ...selectedMeeting, status: liveStatus(selectedMeeting, clock) }} loading={detailLoading} canDelete={canDelete} deleting={deletingId === selectedMeeting.id} onClose={() => setSelectedMeeting(null)} onDelete={() => { setDeleteTarget(selectedMeeting); setSelectedMeeting(null); }} /> : null}
    {formOpen ? <MeetingFormModal key={formTarget?.id ?? "new"} meeting={formTarget} saving={saving} onClose={() => { if (!saving) { setFormOpen(false); setFormTarget(null); } }} onSave={saveMeeting} /> : null}
    {deleteTarget ? <DeleteMeetingModal meeting={deleteTarget} busy={deletingId === deleteTarget.id} onCancel={() => { if (!deletingId) setDeleteTarget(null); }} onConfirm={() => void removeMeeting()} /> : null}
  </div>;
}

function emptyLabel(tab: AdminMeetingTab) {
  return tab === "active" ? "Chưa có lịch họp phù hợp" : tab === "history" ? "Chưa có lịch sử trong khoảng này" : tab === "pending" ? "Không có yêu cầu đang chờ" : "Không có yêu cầu hủy";
}

function minutesOf(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function timeText(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }

function MeetingFormModal({ meeting, saving, onClose, onSave }: {
  meeting: AdminMeeting | null; saving: boolean; onClose: () => void; onSave: (input: AdminMeetingInput) => Promise<void>;
}) {
  const [initialSlot] = useState(() => getNextMeetingSlot());
  const [now, setNow] = useState(() => new Date());
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [organizer, setOrganizer] = useState(meeting?.organizer ?? "");
  const [email, setEmail] = useState(meeting?.email ?? "");
  const [department, setDepartment] = useState(getMeetingDepartmentName(meeting?.department));
  const [roomId, setRoomId] = useState<AdminMeetingInput["roomId"]>(meeting?.roomId ?? "room-01");
  const [date, setDate] = useState(meeting?.date ?? initialSlot.date);
  const [start, setStart] = useState(meeting?.start ?? initialSlot.start);
  const [durationMinutes, setDurationMinutes] = useState(meeting?.durationMinutes ?? 30);
  const [attendees, setAttendees] = useState(meeting?.attendees ?? 1);
  const [busySlots, setBusySlots] = useState<AdminMeeting[]>([]);
  const [formError, setFormError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const readOnlyBooking = meeting?.status === "ongoing";
  const room = ROOMS.find((item) => item.id === roomId)!;
  const end = timeText(minutesOf(start) + durationMinutes);
  const timeOptions = getFutureMeetingTimes(date, now);
  const durationOptions = getMeetingDurationOptions(start);
  const minimumDate = getNextMeetingSlot(now).date;
  const canUseSelectedTime = timeOptions.includes(start);
  const validDuration = durationOptions.includes(durationMinutes);

  useEffect(() => {
    if (formError) errorRef.current?.scrollIntoView({ block: "nearest" });
  }, [formError]);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  const changeStart = (value: string) => {
    setStart(value);
    const options = getMeetingDurationOptions(value);
    if (!options.includes(durationMinutes)) setDurationMinutes(options.at(-1) ?? 30);
    setFormError("");
  };
  const changeDate = (value: string) => {
    setDate(value);
    const options = getFutureMeetingTimes(value);
    if (options.length && !options.includes(start)) changeStart(options[0]);
    setFormError("");
  };

  useEffect(() => {
    if (!date || readOnlyBooking) return;
    const controller = new AbortController();
    setLoadingSlots(true);
    void getAdminMeetings({ source: "active", roomId, dateFrom: date, dateTo: date, limit: 500, page: 1 }, controller.signal)
      .then((result) => setBusySlots(result.items.filter((item) => item.id !== meeting?.id)))
      .catch(() => { if (!controller.signal.aborted) setBusySlots([]); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSlots(false); });
    return () => controller.abort();
  }, [roomId, date, meeting?.id, readOnlyBooking]);

  const overlaps = busySlots.some((item) => minutesOf(start) < minutesOf(item.end) + 15 && minutesOf(end) + 15 > minutesOf(item.start));
  const overlapsLunch = minutesOf(start) < 13 * 60 && minutesOf(end) > 12 * 60;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (title.trim().length < 3 || title.trim().length > 200) return setFormError("Tiêu đề phải từ 3 đến 200 ký tự.");
    if (organizer.trim().length < 2 || organizer.trim().length > 100) return setFormError("Nhập tên người chủ trì hợp lệ.");
    if (!/^[^\s@]+@asiafnb\.com$/i.test(email.trim())) return setFormError("Email phải thuộc miền @asiafnb.com.");
    if (department.trim().length < 2) return setFormError("Vui lòng chọn phòng ban.");
    if (!readOnlyBooking && !getFutureMeetingTimes(date).includes(start)) return setFormError("Hãy chọn ngày và giờ bắt đầu trong tương lai theo giờ Việt Nam.");
    if (!readOnlyBooking && overlapsLunch) return setFormError("Cuộc họp không được trùng giờ nghỉ trưa 12:00–13:00.");
    if (!readOnlyBooking && !validDuration) return setFormError("Cuộc họp phải kéo dài ít nhất 30 phút và kết thúc không muộn hơn 17:00.");
    if (!readOnlyBooking && overlaps) return setFormError("Phòng có lịch trùng hoặc chưa đủ 15 phút nghỉ giữa các cuộc họp.");
    if (!Number.isInteger(attendees) || attendees < 1 || attendees > room.capacity) return setFormError(`Phòng này nhận từ 1 đến ${room.capacity} người.`);
    try {
      await onSave({ title: title.trim(), organizer: organizer.trim(), email: email.trim(), department: department.trim(), roomId, date, start, durationMinutes, attendees });
    } catch (cause) {
      if (cause instanceof ApiError && cause.errors.length) setFormError(cause.errors.join(" "));
      else if (cause instanceof ApiError) setFormError(cause.message);
    }
  };
  const inputClass = "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500";
  return createPortal(<div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="meeting-form-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Quản lý đặt phòng họp</p><h2 id="meeting-form-title" className="mt-1 text-lg font-extrabold text-slate-900">{meeting ? "Cập nhật lịch họp" : "Thêm lịch họp"}</h2></div><button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button></header>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
        <div className="meeting-form-scroll min-h-0 space-y-4 overflow-y-auto p-5">
        {formError ? <div ref={errorRef} role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{formError}</div> : null}
        {readOnlyBooking ? <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-800">Cuộc họp đang diễn ra. Backend chỉ cho phép sửa tiêu đề, người chủ trì, email và phòng ban.</p> : null}
        <label className="block text-sm font-bold text-slate-700">Tiêu đề cuộc họp<input required minLength={3} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Người đặt / chủ trì<input id="meeting-organizer" name="organizer" autoComplete="name" minLength={2} maxLength={100} required value={organizer} onChange={(event) => setOrganizer(event.target.value)} className={inputClass} /></label><label className="block text-sm font-bold text-slate-700">Email @asiafnb.com<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label></div>
        <div className="text-sm font-bold text-slate-700"><p>Phòng ban</p><MeetingDepartmentSelect value={department} onChange={setDepartment} triggerClassName="mt-1.5 h-10 py-0" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Phòng họp<select disabled={readOnlyBooking} value={roomId} onChange={(event) => { setRoomId(event.target.value as AdminMeetingInput["roomId"]); setAttendees((current) => Math.min(current, ROOMS.find((item) => item.id === event.target.value)?.capacity ?? 12)); }} className={inputClass}>{ROOMS.map((item) => <option key={item.id} value={item.id}>{item.name} · tối đa {item.capacity} người</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Ngày tổ chức<input required type="date" min={minimumDate} disabled={readOnlyBooking} value={date} onChange={(event) => changeDate(event.target.value)} onBlur={() => { if (date && date < minimumDate) changeDate(minimumDate); }} className={inputClass} /></label></div>
        <div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-bold text-slate-700">Giờ bắt đầu<select required disabled={readOnlyBooking || timeOptions.length === 0} value={start} onChange={(event) => changeStart(event.target.value)} className={inputClass}>{!timeOptions.includes(start) ? <option value={start} disabled>{readOnlyBooking ? start : "Chọn giờ tương lai"}</option> : null}{timeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Thời lượng<select disabled={readOnlyBooking} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className={inputClass}>{!durationOptions.includes(durationMinutes) ? <option value={durationMinutes} disabled>{durationMinutes} phút</option> : null}{durationOptions.map((value) => <option key={value} value={value}>{value} phút</option>)}</select></label><div className="text-sm font-bold text-slate-700">Giờ kết thúc<div className="mt-1.5 flex h-10 items-center rounded-xl bg-slate-50 px-3 text-sm text-slate-600">{end}</div></div></div>
        <label className="block text-sm font-bold text-slate-700">Số người tham gia<input required type="number" min={1} max={room.capacity} disabled={readOnlyBooking} value={attendees} onChange={(event) => setAttendees(Number(event.target.value))} className={inputClass} /></label>
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button><button type="submit" disabled={saving || (!readOnlyBooking && (!canUseSelectedTime || !validDuration || loadingSlots))} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? <><LoaderCircle size={15} className="animate-spin" />Đang lưu…</> : meeting ? "Cập nhật" : "Lưu lịch"}</button></footer>
      </form>
    </section>
  </div>, document.body);
}

function DeleteMeetingModal({ meeting, busy, onCancel, onConfirm }: { meeting: AdminMeeting; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => { const listener = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onCancel(); }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); }, [busy, onCancel]);
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-meeting-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={19} /></span><div className="min-w-0"><h2 id="delete-meeting-title" className="text-base font-extrabold text-slate-900">Xóa lịch họp?</h2><p className="mt-1 text-sm font-semibold text-slate-700">{meeting.title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{roomLabel(meeting.roomId)} · {formatDate(meeting.date)} · {meeting.start}–{meeting.end}</p></div></div><p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-700">Lịch họp sẽ bị xóa vĩnh viễn và không thể khôi phục.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button><button type="button" disabled={busy} onClick={onConfirm} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? <><LoaderCircle size={14} className="animate-spin" />Đang xóa…</> : "Xác nhận xóa"}</button></div></section></div>;
}

function RoundedFilterSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "Chọn";

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div className="grid gap-1.5 text-sm font-semibold text-slate-600"><span>{label}</span><div ref={rootRef} className="relative">
    <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-100 ${open ? "border-emerald-500" : "border-slate-200 hover:border-slate-300"}`}><span className="truncate">{selectedLabel}</span><ChevronDown size={17} className={`shrink-0 text-slate-700 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    {open ? <div role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-[60] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_35px_rgba(15,23,42,0.16)]">{options.map((option) => <button key={option.value || "all"} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); }} className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm transition ${option.value === value ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-700 hover:bg-slate-50"}`}><span className="truncate">{option.label}</span>{option.value === value ? <Check size={15} className="shrink-0 text-emerald-700" /> : null}</button>)}</div> : null}
  </div></div>;
}

function StatusPill({ expired }: { expired: boolean }) {
  return <span className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${expired ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${expired ? "bg-slate-400" : "bg-amber-500"}`} />{expired ? "Đã hết hạn" : "Chờ OTP"}</span>;
}

function RequestActions({ canDelete, busy, onRevoke }: { canDelete: boolean; busy: boolean; onRevoke: () => void }) {
  return canDelete ? <button type="button" disabled={busy} onClick={onRevoke} title="Thu hồi yêu cầu" className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}<span className="hidden sm:inline">Thu hồi</span></button> : <span className="text-sm text-slate-300">—</span>;
}

function WeekSchedule({ meetings, days, onSelect }: { meetings: (AdminMeeting | MeetingRequest)[]; days: string[]; onSelect: (meeting: AdminMeeting) => void }) {
  const bookings = meetings as AdminMeeting[];
  const slots = [
    { start: "07:00", end: "08:30" }, { start: "08:45", end: "10:15" },
    { start: "10:30", end: "12:00" }, { start: "13:30", end: "15:00" },
    { start: "15:15", end: "16:45" }, { start: "17:00", end: "18:30" },
  ];
  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain"><div className="min-w-[1000px] p-3 sm:p-4">
    <div className="grid grid-cols-[90px_repeat(6,minmax(145px,1fr))] overflow-hidden rounded-xl border border-[#dce7f5]">
      <div className="flex min-h-11 items-center justify-center bg-[#f3f7fc] px-2 text-sm font-bold text-[#30456a]">Thời gian</div>
      {days.map((day, index) => <div key={day} className={`flex min-h-11 flex-col items-center justify-center border-l border-[#dce7f5] px-2 text-center ${day === isoToday() ? "bg-emerald-50" : "bg-[#f3f7fc]"}`}><span className="text-sm font-bold text-[#30456a]">{dayNames[index]}</span><span className="text-sm font-semibold text-slate-500">{formatDate(day).slice(0, 5)}</span></div>)}
      {slots.map((slot) => <div key={slot.start} className="contents">
        <div className="flex min-h-[108px] items-center justify-center border-t border-[#dce7f5] bg-[#f7faff] px-2 text-center text-sm font-bold text-[#17345f]">{slot.start} – {slot.end}</div>
        {days.map((day) => {
          const meeting = bookings.filter((item) => {
            if (item.date !== day) return false;
            const itemStart = minutesOf(item.start);
            const itemEnd = minutesOf(item.end);
            const slotStart = minutesOf(slot.start);
            const slotEnd = minutesOf(slot.end);
            const firstOverlappingSlot = slots.find((candidate) => itemStart < minutesOf(candidate.end) && itemEnd > minutesOf(candidate.start));
            return itemStart < slotEnd && itemEnd > slotStart && firstOverlappingSlot?.start === slot.start;
          });
          return <div key={`${day}-${slot.start}`} className={`flex min-h-[108px] flex-col gap-1 border-l border-t border-[#dce7f5] p-1.5 ${day === isoToday() ? "bg-emerald-50/20" : "bg-white"}`}>
            {meeting.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item)} title={`${item.title} · ${item.start}–${item.end} · ${roomLabel(item.roomId)}`} className="w-full min-w-0 rounded-xl border border-slate-200 border-l-[3px] border-l-[#b9cee8] bg-slate-50 px-2 py-1.5 text-left shadow-[0_2px_6px_rgba(15,23,42,0.07)] transition hover:border-emerald-300 hover:bg-emerald-50">
              <span className="block truncate text-sm font-bold leading-4 text-slate-800">{item.title}</span>
              <span className="mt-1 flex min-w-0 items-center gap-1 text-sm leading-5 text-slate-500"><Clock3 size={11} className="shrink-0" /><span className="truncate">{item.start} - {item.end}</span></span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1 text-sm leading-5 text-slate-500"><MapPin size={11} className="shrink-0" /><span className="truncate">{roomLabel(item.roomId)}</span></span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1 text-sm leading-5 text-slate-500"><UsersRound size={11} className="shrink-0" /><span className="truncate uppercase">{item.department}</span></span>
            </button>)}
          </div>;
        })}
      </div>)}
    </div>
  </div></div>;
}

function MeetingDetails({ meeting, loading, canDelete, deleting, onClose, onDelete }: { meeting: AdminMeeting; loading: boolean; canDelete: boolean; deleting: boolean; onClose: () => void; onDelete: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  const image = ROOMS.find(({ id }) => id === meeting.roomId)?.image;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="meeting-detail-title" className="grid max-h-[94dvh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl md:grid-cols-[0.85fr_1.15fr]"><div className="relative min-h-48 bg-emerald-950 md:min-h-full"><div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `linear-gradient(180deg,rgba(2,44,34,.04),rgba(2,44,34,.45)),url('${image}')` }} /><div className="absolute inset-x-4 bottom-4 text-white"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-sm font-bold backdrop-blur"><MapPin size={12} />{roomLabel(meeting.roomId)}</span><p className="mt-2 text-lg font-extrabold">Không gian họp Asia</p><p className="text-sm text-white/80">Sức chứa tối đa {ROOMS.find(({ id }) => id === meeting.roomId)?.capacity} người</p></div></div><div className="min-w-0 p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Chi tiết cuộc họp</p><h2 id="meeting-detail-title" className="mt-1 text-xl font-extrabold leading-tight text-slate-900">{meeting.title}</h2></div><button type="button" aria-label="Đóng chi tiết" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={17} /></button></div><div className="mt-3 flex flex-wrap gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ring-1 ring-inset ${statusClass(meeting.status)}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot(meeting.status)}`} />{statusLabel(meeting.status)}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-800">Nguồn: {meeting.source === "history" ? "Lịch sử" : "Đang hoạt động"}</span></div><div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 text-sm"><DetailItem icon={CalendarDays} label="Ngày họp" value={formatDate(meeting.date)} /><DetailItem icon={Clock3} label="Thời gian" value={`${meeting.start} – ${meeting.end}`} /><DetailItem icon={MapPin} label="Phòng họp" value={roomLabel(meeting.roomId)} /><DetailItem icon={UsersRound} label="Số người" value={`${meeting.attendees} người`} /><DetailItem icon={UsersRound} label="Người chủ trì" value={meeting.organizer} /><DetailItem icon={Mail} label="Email" value={meeting.email} /><DetailItem icon={Filter} label="Phòng ban" value={meeting.department} /></div>{loading ? <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={14} className="animate-spin" />Đang tải thông tin...</p> : null}<div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Đóng</button>{canDelete ? <button type="button" disabled={deleting} onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"><Trash2 size={14} />{deleting ? "Đang xóa..." : "Xóa lịch"}</button> : null}</div></div></section></div>;
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-2.5"><Icon size={15} className="mt-0.5 shrink-0 text-emerald-700" /><div className="min-w-0"><p className="text-sm text-slate-400">{label}</p><p className="mt-0.5 break-words text-sm font-semibold text-slate-700">{value}</p></div></div>;
}
