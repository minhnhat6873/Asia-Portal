"use client";

import { useDelayedLoading } from "@/lib/useDelayedLoading";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Filter, LayoutGrid, List, Plus, RotateCcw, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/services/api";
import { softDeleteAdminMedia, updateAdminMedia, type AdminMediaListParams } from "@/services/admin-media.service";
import MediaExpiryBadge from "@/components/ui/MediaExpiryBadge";
import type { MediaCategory, MediaPost } from "../types";
import { MEDIA_FILTER_CATEGORIES, MediaScopeFilter, selectionFilter } from "./MediaScopeFilter";
import { AdminSelect } from "./AdminSelect";
import { useAdminPermissions } from "@/lib/adminPermissions";
import { ArticleReaderModal } from "./ArticleReaderModal";
import MediaManagementTable, { mediaPublicationLabel } from "./MediaManagementTable";

import { mediaFont } from "../media-font";

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
  onNavigateToTrash: () => void;
}


export function MediaManagement({ mediaPosts, total, page, pageSize, isLoading, loadError, onFiltersChange, onPageChange, onReload, onUpdated, onDeleted, previewPost, onSelectPreview, onNavigateToAdd, onNavigateToEdit, onNavigateToTrash }: Props) {
  const showLoading = useDelayedLoading(isLoading);
  const [search, setSearch] = useState("");
  // Every box starts checked (= all posts).
  const [categories, setCategories] = useState<MediaCategory[]>(MEDIA_FILTER_CATEGORIES);
  // "" = every post, "featured" = highlighted only, "normal" = the others.
  const [featured, setFeatured] = useState("");
  const { can } = useAdminPermissions();
  const [status, setStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [deleteTarget, setDeleteTarget] = useState<MediaPost | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ post: MediaPost; nextStatus: MediaPost["status"] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") onReload(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [onReload]);

  useEffect(() => {
    const timer = window.setTimeout(() => onFiltersChange({
      search: search.trim() || undefined,
      categories: selectionFilter(categories, MEDIA_FILTER_CATEGORIES),
      featured: featured ? featured === "featured" : undefined,
      status: status ? status as MediaPost["status"] : undefined,
      sort: "latest",
    }), 300);
    return () => window.clearTimeout(timer);
  }, [search, categories, featured, status, onFiltersChange]);

  const reset = () => { setSearch(""); setCategories(MEDIA_FILTER_CATEGORIES); setFeatured(""); setStatus(""); };
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
    if (!can("media:publish") || isChangingStatus || (post.status === nextStatus && !(nextStatus === "draft" && post.hiddenReason === "expired"))) return;
    setIsChangingStatus(true);
    try {
      const updated = await updateAdminMedia(post.id, { status: nextStatus });
      onUpdated(updated);
      toast.success(nextStatus === "published" ? updated.isExpired ? "Đã hiển thị bài viết kèm nhãn Tin đã hết hạn." : "Đã đăng tin." : "Đã ẩn tin.");
      setStatusChangeTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.errors[0] ?? error.message : "Không thể đổi trạng thái bài viết.");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const requestStatusChange = (post: MediaPost, nextStatus: MediaPost["status"]) => {
    if (!can("media:publish") || isChangingStatus || (post.status === nextStatus && !(nextStatus === "draft" && post.hiddenReason === "expired"))) return;
    setStatusChangeTarget({ post, nextStatus });
  };

  const remove = async () => {
    if (!can("media:delete") || !deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    try {
      await softDeleteAdminMedia(deleteTarget.id);
      onDeleted(deleteTarget.id);
      onSelectPreview(null);
      setDeleteTarget(null);
      toast.success("Đã chuyển bài viết vào thùng rác.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.errors[0] ?? error.message : "Không thể chuyển bài viết vào thùng rác.");
    } finally { deletingRef.current = false; setIsDeleting(false); }
  };

  return (
    <div className={`${mediaFont.className} space-y-4 text-[#172B24]`}>
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-[15px] shadow-[0_2px_7px_rgba(15,23,42,0.08)]">
        <div className="relative min-w-0 basis-full xl:basis-[500px] xl:flex-none"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề hoặc Sapo..." className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pl-10 pr-3 text-[14px] font-medium text-[#172B24] outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10" /></div>
        <MediaScopeFilter categories={categories} onCategoriesChange={setCategories} />
        <AdminSelect value={featured} onChange={setFeatured} options={[{ value: "", label: "Tất cả tin" }, { value: "featured", label: "Tin nổi bật" }, { value: "normal", label: "Tin thường" }]} icon={<Star className="h-4 w-4 text-amber-500" />} className="[&>div>div]:[scrollbar-width:none] [&>div>div::-webkit-scrollbar]:hidden w-full shrink-0 sm:w-[180px] [&>button]:h-12 [&>button]:gap-1.5 [&>button>span]:gap-2 [&>button]:rounded-xl [&>button]:px-3 [&>button]:py-0 [&>button]:text-[14px] [&>button]:font-bold [&>button]:text-[#172B24]" searchable={false} showSelectionCheck={false} />
        <AdminSelect value={status} onChange={setStatus} options={[{ value: "", label: "Tất cả trạng thái" }, { value: "published", label: "Đăng tin" }, { value: "draft", label: "Ẩn Tin" }]} icon={<Filter className="h-4 w-4 text-[#00852f]" />} className="[&>div>div]:[scrollbar-width:none] [&>div>div::-webkit-scrollbar]:hidden w-full shrink-0 sm:w-[205px] [&>button]:h-12 [&>button]:gap-1.5 [&>button>span]:gap-2 [&>button]:rounded-xl [&>button]:px-3 [&>button]:py-0 [&>button]:text-[14px] [&>button]:font-bold [&>button]:text-[#172B24]" searchable={false} showSelectionCheck={false} />
        <button type="button" onClick={reset} className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] font-semibold text-slate-600"><RotateCcw className="h-4 w-4" />Đặt lại</button>
        <div className="flex h-12 shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-1"><button type="button" aria-label="Hiển thị dạng thẻ" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} className={`cursor-pointer rounded-lg p-1.5 ${viewMode === "grid" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200" : "text-slate-500"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" aria-label="Hiển thị dạng bảng" aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")} className={`cursor-pointer rounded-lg p-1.5 ${viewMode === "table" ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200" : "text-slate-500"}`}><List className="h-4 w-4" /></button></div>
        <button type="button" hidden={!can("media:trash")} onClick={onNavigateToTrash} className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"><Trash2 className="h-4 w-4" />Thùng rác</button>
        <button type="button" hidden={!can("media:create")} onClick={onNavigateToAdd} className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#008bd2] px-4 py-2.5 text-[14px] font-semibold transition-colors hover:bg-[#007bbd] text-white"><Plus className="h-4 w-4" />Đăng bài mới</button>
      </div>

      <section id="admin-media-results" className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#edf1f4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.025)]">
      {showLoading ? <div role="status" className="p-12 text-center text-sm text-slate-500">Đang tải danh sách truyền thông...</div> : loadError ? <div className="p-8 text-center text-sm text-rose-700"><p>{loadError}</p><button type="button" onClick={onReload} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white">Thử lại</button></div> : mediaPosts.length === 0 ? <div hidden={isLoading} className="p-12 text-center text-sm text-slate-400">Không có bài viết phù hợp.</div> : viewMode === "grid" ? (
        <div className="grid gap-5 p-4 sm:grid-cols-2 xl:grid-cols-3">{mediaPosts.map((post) => <button type="button" key={post.id} onClick={() => onSelectPreview(post)} className="group overflow-hidden rounded-3xl bg-white text-left shadow-md"><div className="relative aspect-[4/3] bg-slate-100">{post.coverImage ? <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent" /><span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-slate-800">{post.category}</span><span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${post.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{mediaPublicationLabel(post)}</span><div className="absolute inset-x-4 bottom-4 text-white"><h3 className="line-clamp-2 font-bold">{post.title}</h3><MediaExpiryBadge isExpired={post.isExpired} /><p className="mt-1 text-xs text-white/70">{post.publishDate}</p></div></div></button>)}</div>
      ) : (
        <MediaManagementTable posts={mediaPosts} canPublish={can("media:publish")} canEdit={can("media:update")} canDelete={can("media:delete")} changingStatus={isChangingStatus} onStatusChange={requestStatusChange} onPreview={onSelectPreview} onEdit={onNavigateToEdit} onDelete={setDeleteTarget} />
      )}

      {total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
        <p className="text-xs font-medium text-slate-500">Hiển thị {total ? (page - 1) * pageSize + 1 : 0} – {total ? Math.min((page - 1) * pageSize + mediaPosts.length, total) : 0} trong {total} bài viết</p>
        <nav aria-label="Chuyển trang bài viết" className="flex max-w-full flex-wrap items-center gap-1.5">
          <button type="button" aria-label="Trang trước" disabled={page <= 1 || isLoading} onClick={() => goToPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {paginationItems.map((item, index) => item === "ellipsis"
            ? <span key={`ellipsis-${index}`} aria-hidden="true" className="min-w-5 text-center text-sm text-slate-400">…</span>
            : <button key={item} type="button" aria-current={page === item ? "page" : undefined} disabled={isLoading} onClick={() => goToPage(item)} className={`grid h-9 min-w-9 place-items-center rounded-full border px-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed ${page === item ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"}`}>{item}</button>)}
          <button type="button" aria-label="Trang sau" disabled={page >= totalPages || isLoading} onClick={() => goToPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </nav>
      </div>}
      </section>

      {previewPost && <ArticleReaderModal key={previewPost.id} post={previewPost} onClose={() => onSelectPreview(null)} onEdit={can("media:update") ? () => onNavigateToEdit(previewPost) : undefined} onDelete={can("media:delete") ? () => setDeleteTarget(previewPost) : undefined} />}

      {statusChangeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="media-status-title" aria-describedby="media-status-description" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className={`mx-auto flex h-10 w-12 items-center justify-center rounded-full ${statusChangeTarget.nextStatus === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {statusChangeTarget.nextStatus === "published" ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
            </div>
            <h3 id="media-status-title" className="mt-4 text-lg font-bold text-slate-900">{statusChangeTarget.nextStatus === "published" ? statusChangeTarget.post.isExpired ? "Đăng tin đã hết hạn?" : "Đăng tin?" : "Ẩn tin?"}</h3>
            <p id="media-status-description" className="mt-2 text-sm leading-6 text-slate-500">“{statusChangeTarget.post.title}” {statusChangeTarget.nextStatus === "published" ? "sẽ hiển thị trên trang tin tức công khai." : "sẽ được ẩn khỏi trang tin tức công khai."}{statusChangeTarget.nextStatus === "published" && statusChangeTarget.post.isExpired ? " Bài viết vẫn được đánh dấu đã hết hạn cho đến khi bạn chỉnh sửa thời hạn." : ""}</p>
            <div className="mt-6 flex justify-center gap-2">
              <button type="button" onClick={() => setStatusChangeTarget(null)} disabled={isChangingStatus} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button type="button" onClick={() => void changeStatus(statusChangeTarget.post, statusChangeTarget.nextStatus)} disabled={isChangingStatus} className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${statusChangeTarget.nextStatus === "published" ? "bg-emerald-600" : "bg-amber-700"}`}>
                {statusChangeTarget.nextStatus === "published" ? (isChangingStatus ? "Đang đăng tin..." : statusChangeTarget.post.isExpired ? "Hiển thị tin đã hết hạn" : "Xác nhận đăng tin") : (isChangingStatus ? "Đang ẩn tin..." : "Xác nhận ẩn tin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="media-soft-delete-title" className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 text-center"><Trash2 className="mx-auto h-10 w-10 text-rose-600" /><h3 id="media-soft-delete-title" className="mt-3 text-lg font-bold">Chuyển bài viết vào thùng rác?</h3><p className="mt-2 text-sm text-slate-500">“{deleteTarget.title}” sẽ được ẩn khỏi trang công khai và chuyển vào thùng rác. Bạn có thể khôi phục lại sau.</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Hủy</button><button type="button" onClick={() => void remove()} disabled={isDeleting} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isDeleting ? "Đang chuyển..." : "Chuyển vào thùng rác"}</button></div></div></div>}
    </div>
  );
}
