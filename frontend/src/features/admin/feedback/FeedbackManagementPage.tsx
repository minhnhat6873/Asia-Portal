"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, Layers, MessageCircle, Pin, PinOff, RefreshCw, Search, Trash2, User, X } from "lucide-react";
import { FEEDBACK_PAGE_SIZE, listFeedback, getFeedback, updateFeedback, deleteFeedback } from "@/services/admin-feedback.service";
import { toast } from "sonner";
import { AdminSelect } from "@/features/admin/dashboard/components/AdminSelect";
import { FEEDBACK_STATUS_LABELS, type FeedbackItem, type FeedbackStatus } from "./feedback.types";
import { feedbackPlainText } from "./feedback.utils";
import { RichText } from "@/components/ui/RichText";

function AnonymousIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-600" fill="currentColor">
      <path d="M4 8.4 6.1 3.3a1.8 1.8 0 0 1 2.4-1l2.2 1a2.7 2.7 0 0 0 2.2 0l2.2-1a1.8 1.8 0 0 1 2.4 1L20 8.4c1.2.4 2 1 2 1.6 0 1-4.5 1.8-10 1.8S2 11 2 10c0-.6.8-1.2 2-1.6Zm2.3 4.2a3.4 3.4 0 0 1 3.3 2.6 5.5 5.5 0 0 1 4.8 0 3.4 3.4 0 1 1-.1 1.7 3.8 3.8 0 0 0-4.6 0 3.4 3.4 0 1 1-3.4-4.3Zm0 1.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm11.4 0a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM5.5 19c-2.2.7-3.5 1.9-3.5 3h20c0-1.1-1.3-2.3-3.5-3L16 20.2l-4 1.5-4-1.5L5.5 19Z" />
    </svg>
  );
}

type StatusFilter = "all" | FeedbackStatus;

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: FEEDBACK_STATUS_LABELS.pending },
  { value: "seen", label: FEEDBACK_STATUS_LABELS.seen },
] as const;

const STATUS_STYLES: Record<FeedbackStatus, { className: string; icon: typeof Check }> = {
  pending: { className: "border-slate-200 bg-slate-100 text-slate-700", icon: Clock3 },
  seen: { className: "border-emerald-100 bg-emerald-50 text-emerald-700", icon: Eye },
};

/** Trạng thái không xác định (dữ liệu cũ hoặc từ API) hiển thị như "Chưa xử lý" thay vì làm sập trang. */
function statusStyle(status: FeedbackStatus) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

function formatDate(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function excerpt(value: string, max: number) {
  const characters = Array.from(value);
  return characters.length > max ? `${characters.slice(0, max).join("").trimEnd()}…` : value;
}

/** Trả về danh sách số trang có dấu "…" ở giữa, ví dụ 1 2 3 … 38. */
function getPageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 1, total - 2].forEach((page) => pages.add(page));
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1] > 1 ? ["gap" as const, page] : [page]));
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const { className, icon: Icon } = statusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
      {FEEDBACK_STATUS_LABELS[status] ?? FEEDBACK_STATUS_LABELS.pending}
    </span>
  );
}

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "green" | "slate"; icon: typeof Check }) {
  const isSlate = tone === "slate";
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${isSlate ? "border-slate-200/80" : "border-emerald-100/70"}`}>
      <div className="relative z-10 flex items-center gap-5">
        <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isSlate ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
      <svg aria-hidden="true" viewBox="0 0 200 40" preserveAspectRatio="none" className={`absolute inset-x-0 bottom-0 h-10 w-full ${isSlate ? "text-slate-100" : "text-emerald-100"}`}>
        <path d="M0 40 L0 32 C60 34 110 30 150 18 C170 12 185 6 200 2 L200 40 Z" fill="currentColor" opacity="0.8" />
      </svg>
    </div>
  );
}

/** Đóng popover khi bấm ra ngoài hoặc nhấn Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return { open, setOpen, rootRef };
}

const MENU_CLASS = "absolute top-[calc(100%+0.375rem)] z-30 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]";
const MENU_ITEM_CLASS = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-50";

function StatusDropdown({ item, onChangeStatus }: { item: FeedbackItem; onChangeStatus: (status: FeedbackStatus) => void }) {
  const { open, setOpen, rootRef } = usePopover();
  const { className, icon: Icon } = statusStyle(item.status);
  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-label={`Trạng thái: ${FEEDBACK_STATUS_LABELS[item.status] ?? FEEDBACK_STATUS_LABELS.pending}. Bấm để đổi`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${className}`}>
        <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
        {FEEDBACK_STATUS_LABELS[item.status] ?? FEEDBACK_STATUS_LABELS.pending}
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className={`${MENU_CLASS} left-0 w-44`}>
          {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((status) => {
            const OptionIcon = statusStyle(status).icon;
            const isCurrent = status === item.status;
            return (
              <button key={status} type="button" role="menuitemradio" aria-checked={isCurrent} onClick={() => { setOpen(false); if (!isCurrent) onChangeStatus(status); }} className={`${MENU_ITEM_CLASS} justify-between ${isCurrent ? "bg-emerald-50/70" : ""} ${status === "seen" ? "text-emerald-700" : "text-slate-700"}`}>
                <span className="flex items-center gap-2.5"><OptionIcon aria-hidden="true" className="h-4 w-4" />{FEEDBACK_STATUS_LABELS[status] ?? FEEDBACK_STATUS_LABELS.pending}</span>
                {isCurrent && <Check aria-hidden="true" className="h-4 w-4 rounded-full bg-emerald-600 p-0.5 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowActions({ item, onView, onTogglePin, onDelete }: { item: FeedbackItem; onView: () => void; onTogglePin: () => void; onDelete: () => void }) {
  const buttonClass = "grid h-9 w-9 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={onView} aria-label={`Xem chi tiết ${item.title}`} title="Xem chi tiết" className={`${buttonClass} text-slate-500 hover:bg-slate-100 focus-visible:outline-slate-500`}><Eye aria-hidden="true" className="h-5 w-5" /></button>
      <button type="button" onClick={onTogglePin} aria-label={item.pinned ? "Bỏ ghim" : "Ghim"} title={item.pinned ? "Bỏ ghim" : "Ghim"} className={`${buttonClass} text-emerald-600 hover:bg-emerald-50 focus-visible:outline-emerald-600`}>{item.pinned ? <PinOff aria-hidden="true" className="h-5 w-5" /> : <Pin aria-hidden="true" className="h-5 w-5" />}</button>
      <button type="button" onClick={onDelete} aria-label={`Xóa ${item.title}`} title="Xóa" className={`${buttonClass} text-rose-600 hover:bg-rose-50 focus-visible:outline-rose-600`}><Trash2 aria-hidden="true" className="h-5 w-5" /></button>
    </div>
  );
}

function ConfirmDeleteDialog({ item, onCancel, onConfirm }: { item: FeedbackItem | null; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (item) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [item]);
  return (
    <dialog ref={dialogRef} aria-labelledby="feedback-delete-title" onClose={onCancel} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-800 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm sm:p-8">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 aria-hidden="true" className="h-6 w-6" /></div>
      <h2 id="feedback-delete-title" className="text-xl font-bold text-slate-900">Xác nhận xóa đóng góp?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Đóng góp <strong className="break-words font-semibold text-slate-700">“{item?.title}”</strong> sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn có chắc chắn muốn tiếp tục?</p>
      <div className="mt-6 flex justify-center gap-3">
        <button autoFocus type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy bỏ</button>
        <button type="button" onClick={onConfirm} className="min-w-32 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Đồng ý</button>
      </div>
    </dialog>
  );
}

function FeedbackDetailDialog({ item, onClose, onChangeStatus }: { item: FeedbackItem | null; onClose: () => void; onChangeStatus: (status: FeedbackStatus) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (item) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [item]);
  const created = item ? formatDate(item.createdAt) : null;

  return (
    <dialog ref={dialogRef} aria-labelledby="feedback-detail-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
      {item && created && (
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-7 w-7" /></span>
              <div className="min-w-0">
                <h2 id="feedback-detail-title" className="break-words text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{item.title}</h2>
                <p className="mt-1 text-base text-slate-500">{created.date} lúc {created.time}</p>
              </div>
            </div>
            <button type="button" aria-label="Đóng" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X aria-hidden="true" className="h-5 w-5" /></button>
          </div>
          <dl className="mt-6 grid gap-4 rounded-2xl bg-emerald-50/70 p-5 text-base sm:grid-cols-2 sm:gap-0">
            <div className="min-w-0 sm:border-r sm:border-emerald-200 sm:pr-5"><dt className="text-slate-500">Người gửi</dt><dd className="mt-2 flex items-center gap-2 font-semibold text-slate-800">{item.sender ? <User aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" /> : <AnonymousIcon />}{item.sender ? item.sender.name : "Ẩn danh"}</dd>{item.sender && <dd className="mt-1 break-all text-sm text-slate-500">{item.sender.email}</dd>}</div>
            <div className="sm:pl-6"><dt className="text-slate-500">Trạng thái</dt><dd className="mt-2"><StatusBadge status={item.status} /></dd></div>
          </dl>
          <section aria-labelledby="feedback-content-title" className="mt-5 rounded-2xl border border-slate-200 p-5">
            <h3 id="feedback-content-title" className="flex items-center gap-2 text-base font-bold text-slate-900"><MessageCircle aria-hidden="true" className="h-5 w-5 text-emerald-700" />Nội dung góp ý</h3>
            <RichText html={item.content} className="mt-2 break-words text-base leading-relaxed text-slate-700 [&_a]:text-emerald-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-200 [&_th]:p-1.5 [&_ul]:list-disc [&_ul]:pl-5" />
          </section>
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {item.status === "seen" && <button type="button" onClick={() => onChangeStatus("pending")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Clock3 aria-hidden="true" className="h-4 w-4" />Đánh dấu chưa xử lý</button>}
            <button type="button" onClick={onClose} className="rounded-xl bg-gradient-to-r from-[#0d5c0d] to-[#1a7a1a] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95">Đóng</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default function FeedbackManagementPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<FeedbackItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, seen: 0, pending: 0 });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const requestVersion = useRef(0);
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 300); return () => clearTimeout(timer); }, [query]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++requestVersion.current;
    try {
      const data = await listFeedback(page, debouncedQuery, statusFilter, signal);
      if (version !== requestVersion.current || signal?.aborted) return;
      if (page > 1 && page > data.pagination.totalPages) { setPage(Math.max(1, data.pagination.totalPages)); return; }
      setItems(data.items); setStats(data.stats); setTotal(data.pagination.total); setPages(data.pagination.totalPages); setError("");
    } catch (e) { if (!signal?.aborted && version === requestVersion.current) setError(e instanceof Error ? e.message : "Không thể tải đóng góp."); }
    finally { if (!signal?.aborted && version === requestVersion.current) setLoading(false); }
  }, [page, debouncedQuery, statusFilter]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => load(controller.signal)); return () => controller.abort(); }, [load, refresh]);
  useEffect(() => { const timer = setInterval(() => { if (document.visibilityState === "visible") setRefresh((v) => v + 1); }, 60000); return () => clearInterval(timer); }, []);
  const totalPages = Math.max(1, pages);
  const currentPage = page;
  const pageItems = items;
  const firstIndex = total === 0 ? 0 : (currentPage - 1) * FEEDBACK_PAGE_SIZE + 1;
  const deleting = items.find((item) => item.id === deletingId) ?? null;
  const updateItem = async (id: string, patch: { status?: FeedbackStatus; pinned?: boolean }) => {
    try { const updated = await updateFeedback(id, patch); setViewing((current) => current?.id === id ? updated : current); setRefresh((v) => v + 1); toast.success("Đã cập nhật đóng góp."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Không thể cập nhật đóng góp."); }
  };
  const changeStatus = (id: string, status: FeedbackStatus) => { void updateItem(id, { status }); };
  const openDetail = async (id: string) => {
    try { const item = await getFeedback(id); setViewing(item); setRefresh((v) => v + 1); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Không thể tải chi tiết."); }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteFeedback(deleting.id); setDeletingId(null); setRefresh((v) => v + 1); toast.success("Đã xóa đóng góp."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Không thể xóa đóng góp."); }
  };

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(1); };

  return (
    <div className="space-y-6">
      {loading && <p role="status">Đang tải đóng góp...</p>}
      {error && <p role="alert" className="text-rose-600">{error} <button type="button" onClick={() => { setLoading(true); setRefresh((v) => v + 1); }} className="underline">Thử lại</button></p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng đóng góp" value={stats.total} tone="green" icon={MessageCircle} />
        <StatCard label="Đã xem" value={stats.seen} tone="green" icon={Eye} />
        <StatCard label="Chưa xử lý" value={stats.pending} tone="slate" icon={Clock3} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.05)] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <label className="relative block">
          <span className="sr-only">Tìm kiếm đóng góp</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input type="search" value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Tìm theo nội dung, tên hoặc email..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-500 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20" />
        </label>
        <AdminSelect value={statusFilter} options={STATUS_OPTIONS} onChange={(value) => resetPage(setStatusFilter)(value as StatusFilter)} searchable={false} icon={<Layers className="h-[18px] w-[18px]" />} />
        <button type="button" onClick={() => { setLoading(true); setRefresh((v) => v + 1); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />Làm mới
        </button>
      </div>

      <section aria-label="Danh sách đóng góp ý kiến" className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.05)] sm:p-4">
        <div className="overflow-x-auto xl:overflow-visible">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-base">
            <thead>
              <tr className="text-sm font-semibold text-slate-700">
                <th scope="col" className="w-12 rounded-l-xl bg-slate-100/80 px-4 py-3">#</th>
                <th scope="col" className="bg-slate-100/80 px-4 py-3">Nội dung đóng góp</th>
                <th scope="col" className="w-56 bg-slate-100/80 px-4 py-3">Người gửi</th>
                <th scope="col" className="w-32 bg-slate-100/80 px-4 py-3">Thời gian</th>
                <th scope="col" className="w-36 bg-slate-100/80 px-4 py-3 text-center">Trạng thái</th>
                <th scope="col" className="w-14 rounded-r-xl bg-slate-100/80 px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-500">Không có đóng góp nào phù hợp với bộ lọc.</td></tr>
              ) : pageItems.map((item, index) => {
                const created = formatDate(item.createdAt);
                return (
                  <tr key={item.id} className={`align-middle [&>td]:border-b [&>td]:border-slate-100 last:[&>td]:border-b-0 ${item.pinned ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-4 font-semibold text-slate-800">{firstIndex + index}</td>
                    <td className="max-w-0 px-4 py-4">
                      <button type="button" onClick={() => openDetail(item.id)} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                        <span className="flex min-w-0 items-center gap-2">
                          {item.pinned && <Pin aria-label="Đã ghim" className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
                          {item.status === "pending" && <span aria-label="Chưa xử lý" className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                          <span className={`truncate text-base font-bold hover:text-emerald-700 ${item.status === "seen" ? "text-slate-700" : "text-slate-900"}`}>{excerpt(item.title, 60)}</span>
                        </span>
                        <span className="mt-1 block truncate text-sm text-slate-500">{excerpt(feedbackPlainText(item.content), 80)}</span>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {item.sender ? <User aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-600" /> : <AnonymousIcon />}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{item.sender?.name ?? "Ẩn danh"}</p>
                          <p className="truncate text-sm text-slate-500">{item.sender?.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm leading-5 text-slate-700">{created.date} {created.time}</td>
                    <td className="px-4 py-4"><div className="flex justify-center"><StatusDropdown item={item} onChangeStatus={(status) => changeStatus(item.id, status)} /></div></td>
                    <td className="px-4 py-4"><RowActions item={item} onView={() => openDetail(item.id)} onTogglePin={() => updateItem(item.id, { pinned: !item.pinned })} onDelete={() => setDeletingId(item.id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-1 pt-4">
          <p className="text-sm text-slate-700">Trang <span className="font-semibold text-emerald-700">{currentPage}</span> / {totalPages}</p>
          <nav aria-label="Phân trang" className="flex items-center gap-2">
            <button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
            {getPageItems(currentPage, totalPages).map((entry, index) => entry === "gap" ? (
              <span key={`gap-${index}`} aria-hidden="true" className="grid h-9 w-7 place-items-center text-slate-500">…</span>
            ) : (
              <button key={entry} type="button" aria-label={`Trang ${entry}`} aria-current={entry === currentPage ? "page" : undefined} onClick={() => setPage(entry)} className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold transition-colors ${entry === currentPage ? "bg-emerald-700 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300"}`}>{entry}</button>
            ))}
            <button type="button" aria-label="Trang sau" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
          </nav>
        </div>
      </section>

      <FeedbackDetailDialog item={viewing} onClose={() => setViewing(null)} onChangeStatus={(status) => viewing && changeStatus(viewing.id, status)} />
      <ConfirmDeleteDialog item={deleting} onCancel={() => setDeletingId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
