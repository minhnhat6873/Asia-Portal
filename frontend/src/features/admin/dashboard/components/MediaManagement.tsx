"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, Eye, EyeOff, LayoutGrid, List, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/services/api";
import { permanentlyDeleteAdminMedia, updateAdminMedia, type AdminMediaListParams } from "@/services/admin-media.service";
import { stripHtml } from "@/utils/stripHtml";
import MediaExpiryBadge from "@/components/ui/MediaExpiryBadge";
import type { MediaCategory, MediaPost } from "../types";
import { AdminSelect } from "./AdminSelect";
import { useAdminPermissions } from "@/lib/adminPermissions";
import { ArticleReaderModal } from "./ArticleReaderModal";

interface Props {
  mediaPosts: MediaPost[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  loadError: string | null;
  onFiltersChange: (params: AdminMediaListParams) => void;
  onPageChange: (page: number) => void;
  onReload: () => void;
  onUpdated: (post: MediaPost) => void;
  onDeleted: (id: string) => void;
  previewPost: MediaPost | null;
  onSelectPreview: (post: MediaPost | null) => void;
  onNavigateToAdd: () => void;
  onNavigateToEdit: (post: MediaPost) => void;
}

const CATEGORIES: MediaCategory[] = ["Sự kiện", "Tin tức", "Nhân sự", "Thông báo"];

function formatCreatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function MediaManagement({ mediaPosts, total, page, pageSize, isLoading, loadError, onFiltersChange, onPageChange, onReload, onUpdated, onDeleted, previewPost, onSelectPreview, onNavigateToAdd, onNavigateToEdit }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const { can } = useAdminPermissions();
  const [status, setStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [deleteTarget, setDeleteTarget] = useState<MediaPost | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ post: MediaPost; nextStatus: MediaPost["status"] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => onFiltersChange({
      search: search.trim() || undefined,
      category: category ? category as MediaCategory : undefined,
      status: status ? status as MediaPost["status"] : undefined,
      sort: "latest",
    }), 300);
    return () => window.clearTimeout(timer);
  }, [search, category, status, onFiltersChange]);

  const reset = () => { setSearch(""); setCategory(""); setStatus(""); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goToPage = (nextPage: number) => {
    onPageChange(nextPage);
    requestAnimationFrame(() => document.getElementById("admin-media-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const paginationItems: (number | "ellipsis")[] = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : page <= 2
      ? [1, 2, 3, 4, "ellipsis", totalPages]
      : page === 3
        ? [1, 2, 3, 4, 5, "ellipsis", totalPages]
        : page >= totalPages - 2
          ? [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
          : [1, 2, "ellipsis", page, page + 1];

  const changeStatus = async (post: MediaPost, nextStatus: MediaPost["status"]) => {
    if (!can("media:publish") || isChangingStatus || post.status === nextStatus) return;
    setIsChangingStatus(true);
    try {
      const updated = await updateAdminMedia(post.id, { status: nextStatus });
      onUpdated(updated);
      toast.success(nextStatus === "published" ? "Đã đăng tin." : "Đã ẩn tin.");
      setStatusChangeTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.errors[0] ?? error.message : "Không thể đổi trạng thái bài viết.");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const requestStatusChange = (post: MediaPost, nextStatus: MediaPost["status"]) => {
    if (!can("media:publish") || isChangingStatus || post.status === nextStatus) return;
    setStatusChangeTarget({ post, nextStatus });
  };

  const remove = async () => {
    if (!can("media:delete") || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteAdminMedia(deleteTarget.id);
      onDeleted(deleteTarget.id);
      onSelectPreview(null);
      setDeleteTarget(null);
      toast.success("Đã xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.errors[0] ?? error.message : "Không thể xóa bài viết.");
    } finally { setIsDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-0 basis-full xl:basis-64 xl:flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề hoặc Sapo..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500" /></div>
        <AdminSelect value={category} onChange={setCategory} options={[{ value: "", label: "Tất cả chuyên mục" }, ...CATEGORIES.map((value) => ({ value, label: value }))]} className="w-full min-w-0 sm:w-48" searchable={false} showSelectionCheck={false} />
        <AdminSelect value={status} onChange={setStatus} options={[{ value: "", label: "Tất cả trạng thái" }, { value: "published", label: "Đăng tin" }, { value: "draft", label: "Ẩn Tin" }]} className="w-full min-w-0 sm:w-44" searchable={false} showSelectionCheck={false} />
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600"><RotateCcw className="h-4 w-4" />Đặt lại</button>
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1"><button type="button" onClick={() => setViewMode("grid")} className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-white shadow-sm" : "text-slate-500"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode("table")} className={`rounded-lg p-2 ${viewMode === "table" ? "bg-white shadow-sm" : "text-slate-500"}`}><List className="h-4 w-4" /></button></div>
        <button type="button" hidden={!can("media:create")} onClick={onNavigateToAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" />Đăng bài mới</button>
      </div>

      <section id="admin-media-results" className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {isLoading ? <div className="p-12 text-center text-sm text-slate-500">Đang tải danh sách truyền thông...</div> : loadError ? <div className="p-8 text-center text-sm text-rose-700"><p>{loadError}</p><button type="button" onClick={onReload} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white">Thử lại</button></div> : mediaPosts.length === 0 ? <div className="p-12 text-center text-sm text-slate-400">Không có bài viết phù hợp.</div> : viewMode === "grid" ? (
        <div className="grid gap-5 p-4 sm:grid-cols-2 xl:grid-cols-3">{mediaPosts.map((post) => <button type="button" key={post.id} onClick={() => onSelectPreview(post)} className="group overflow-hidden rounded-3xl bg-white text-left shadow-md"><div className="relative aspect-[4/3] bg-slate-100">{post.coverImage ? <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent" /><span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-slate-800">{post.category}</span><span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${post.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{post.status === "published" ? "Đăng tin" : "Ẩn Tin"}</span><div className="absolute inset-x-4 bottom-4 text-white"><h3 className="line-clamp-2 font-bold">{post.title}</h3><MediaExpiryBadge isExpired={post.isExpired} /><p className="mt-1 text-xs text-white/70">{post.publishDate}</p></div></div></button>)}</div>
      ) : (
        <div className="overflow-x-auto"><table className="w-full min-w-[1100px] table-fixed text-left text-xs"><thead className="bg-slate-50 text-sm font-semibold text-slate-600"><tr><th className="w-[300px] px-4 py-3">Bài viết</th><th className="px-4 py-3">Chuyên mục</th><th className="px-4 py-3">Ngày đăng</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Người tạo</th><th className="px-4 py-3 text-center">Thao tác</th></tr></thead><tbody>{mediaPosts.map((post) => <tr key={post.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3">{post.coverImage ? <img src={post.coverImage} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" /> : <div className="h-12 w-16 shrink-0 rounded-lg bg-slate-100" />}<div className="min-w-0 flex-1"><p className="block truncate font-bold text-slate-900">{post.title}</p><p className="block truncate text-slate-400">{stripHtml(post.summary)}</p><MediaExpiryBadge isExpired={post.isExpired} /></div></div></td><td className="px-4 py-3">{post.category}</td><td className="px-4 py-3">{post.publishDate}{post.expiryDate && <span className="mt-1 block text-xs text-slate-500">Hết hạn: {post.expiryDate}</span>}</td><td className="px-4 py-3"><AdminSelect value={post.status} onChange={(value) => requestStatusChange(post, value as MediaPost["status"])} options={[{ value: "published", label: "Đăng tin" }, { value: "draft", label: "Ẩn Tin" }]} className={`min-w-36 [&>button]:font-bold ${post.status === "published" ? "[&>button]:border-emerald-200 [&>button]:bg-emerald-50 [&>button]:text-emerald-700" : "[&>button]:border-amber-200 [&>button]:bg-amber-50 [&>button]:text-amber-700"}`} searchable={false} showSelectionCheck={false} disabled={!can("media:publish") || isChangingStatus} /></td><td className="px-4 py-3"><div className="space-y-1 leading-5"><p className="truncate font-semibold text-slate-800">{post.createdBy?.name ?? "Chưa có dữ liệu"}</p><p className="truncate text-slate-500">{post.createdBy?.email ?? "—"}</p><p className="text-[11px] text-slate-400">{formatCreatedAt(post.createdAt)}</p></div></td><td className="px-4 py-3"><div className="flex justify-center gap-3"><button type="button" onClick={() => onSelectPreview(post)} title="Xem"><Eye className="h-4 w-4" /></button><button type="button" hidden={!can("media:update")} onClick={() => onNavigateToEdit(post)} title="Sửa" className="text-emerald-600"><Edit3 className="h-4 w-4" /></button><button type="button" hidden={!can("media:delete")} onClick={() => setDeleteTarget(post)} title="Xóa vĩnh viễn" className="text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
      )}

      {total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
        <p className="text-xs font-medium text-slate-600">Trang <strong className="text-sky-700">{page}</strong> / {totalPages}</p>
        <nav aria-label="Chuyển trang bài viết" className="flex max-w-full flex-wrap items-center gap-1.5">
          <button type="button" aria-label="Trang trước" disabled={page <= 1 || isLoading} onClick={() => goToPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {paginationItems.map((item, index) => item === "ellipsis"
            ? <span key={`ellipsis-${index}`} aria-hidden="true" className="min-w-5 text-center text-sm text-slate-400">…</span>
            : <button key={item} type="button" aria-current={page === item ? "page" : undefined} disabled={isLoading} onClick={() => goToPage(item)} className={`grid h-9 min-w-9 place-items-center rounded-full border px-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed ${page === item ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"}`}>{item}</button>)}
          <button type="button" aria-label="Trang sau" disabled={page >= totalPages || isLoading} onClick={() => goToPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </nav>
      </div>}
      </section>

      {previewPost && <ArticleReaderModal key={previewPost.id} post={previewPost} onClose={() => onSelectPreview(null)} onEdit={can("media:update") ? () => onNavigateToEdit(previewPost) : undefined} onDelete={can("media:delete") ? () => setDeleteTarget(previewPost) : undefined} />}

      {statusChangeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="media-status-title" aria-describedby="media-status-description" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${statusChangeTarget.nextStatus === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {statusChangeTarget.nextStatus === "published" ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
            </div>
            <h3 id="media-status-title" className="mt-4 text-lg font-bold text-slate-900">{statusChangeTarget.nextStatus === "published" ? "Đăng tin?" : "Ẩn tin?"}</h3>
            <p id="media-status-description" className="mt-2 text-sm leading-6 text-slate-500">“{statusChangeTarget.post.title}” {statusChangeTarget.nextStatus === "published" ? "sẽ hiển thị trên trang tin tức công khai." : "sẽ được ẩn khỏi trang tin tức công khai."}</p>
            <div className="mt-6 flex justify-center gap-2">
              <button type="button" onClick={() => setStatusChangeTarget(null)} disabled={isChangingStatus} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button type="button" onClick={() => void changeStatus(statusChangeTarget.post, statusChangeTarget.nextStatus)} disabled={isChangingStatus} className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${statusChangeTarget.nextStatus === "published" ? "bg-emerald-600" : "bg-amber-700"}`}>
                {statusChangeTarget.nextStatus === "published" ? (isChangingStatus ? "Đang đăng tin..." : "Xác nhận đăng tin") : (isChangingStatus ? "Đang ẩn tin..." : "Xác nhận ẩn tin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 text-center"><Trash2 className="mx-auto h-10 w-10 text-rose-600" /><h3 className="mt-3 text-lg font-bold">Xóa vĩnh viễn bài viết?</h3><p className="mt-2 text-sm text-slate-500">“{deleteTarget.title}” sẽ bị xóa khỏi cơ sở dữ liệu và không thể khôi phục.</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Hủy</button><button type="button" onClick={() => void remove()} disabled={isDeleting} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}</button></div></div></div>}
    </div>
  );
}
