"use client";

import { useEffect, useState } from "react";
import { Edit3, Eye, LayoutGrid, List, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/services/api";
import { permanentlyDeleteAdminMedia, updateAdminMedia, type AdminMediaListParams } from "@/services/admin-media.service";
import { stripHtml } from "@/utils/stripHtml";
import type { MediaCategory, MediaPost } from "../types";
import { AdminSelect } from "./AdminSelect";
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
  const [status, setStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [deleteTarget, setDeleteTarget] = useState<MediaPost | null>(null);
  const [publishTarget, setPublishTarget] = useState<MediaPost | null>(null);
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

  const changeStatus = async (post: MediaPost, nextStatus: MediaPost["status"]) => {
    if (post.status === nextStatus) return;
    setIsChangingStatus(true);
    try {
      const updated = await updateAdminMedia(post.id, { status: nextStatus });
      onUpdated(updated);
      toast.success(nextStatus === "published" ? "Đã xuất bản bài viết." : "Đã chuyển bài viết về bản nháp.");
      setPublishTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.errors[0] ?? error.message : "Không thể đổi trạng thái bài viết.");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const requestStatusChange = (post: MediaPost, nextStatus: MediaPost["status"]) => {
    if (post.status === "draft" && nextStatus === "published") {
      setPublishTarget(post);
      return;
    }
    void changeStatus(post, nextStatus);
  };

  const remove = async () => {
    if (!deleteTarget) return;
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
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề hoặc Sapo..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500" /></div>
        <AdminSelect value={category} onChange={setCategory} options={[{ value: "", label: "Tất cả chuyên mục" }, ...CATEGORIES.map((value) => ({ value, label: value }))]} className="min-w-48" searchable={false} showSelectionCheck={false} />
        <AdminSelect value={status} onChange={setStatus} options={[{ value: "", label: "Tất cả trạng thái" }, { value: "published", label: "Đã xuất bản" }, { value: "draft", label: "Bản nháp" }]} className="min-w-44" searchable={false} showSelectionCheck={false} />
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600"><RotateCcw className="h-4 w-4" />Đặt lại</button>
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1"><button type="button" onClick={() => setViewMode("grid")} className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-white shadow-sm" : "text-slate-500"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode("table")} className={`rounded-lg p-2 ${viewMode === "table" ? "bg-white shadow-sm" : "text-slate-500"}`}><List className="h-4 w-4" /></button></div>
        <button type="button" onClick={onNavigateToAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" />Đăng bài mới</button>
      </div>

      <p className="px-1 text-xs text-slate-500">Tổng cộng <strong>{total}</strong> bài viết</p>
      {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Đang tải danh sách truyền thông...</div> : loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700"><p>{loadError}</p><button type="button" onClick={onReload} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white">Thử lại</button></div> : mediaPosts.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Không có bài viết phù hợp.</div> : viewMode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{mediaPosts.map((post) => <button type="button" key={post.id} onClick={() => onSelectPreview(post)} className="group overflow-hidden rounded-3xl bg-white text-left shadow-md"><div className="relative aspect-[4/3] bg-slate-100">{post.coverImage ? <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent" /><span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-slate-800">{post.category}</span><span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${post.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{post.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span><div className="absolute inset-x-4 bottom-4 text-white"><h3 className="line-clamp-2 font-bold">{post.title}</h3><p className="mt-1 text-xs text-white/70">{post.publishDate}</p></div></div></button>)}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[1100px] table-fixed text-left text-xs"><thead className="bg-slate-50 text-sm font-semibold text-slate-600"><tr><th className="w-[300px] px-4 py-3">Bài viết</th><th className="px-4 py-3">Chuyên mục</th><th className="px-4 py-3">Ngày đăng</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Người tạo</th><th className="px-4 py-3 text-center">Thao tác</th></tr></thead><tbody>{mediaPosts.map((post) => <tr key={post.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3">{post.coverImage ? <img src={post.coverImage} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" /> : <div className="h-12 w-16 shrink-0 rounded-lg bg-slate-100" />}<div className="min-w-0 flex-1"><p className="block truncate font-bold text-slate-900">{post.title}</p><p className="block truncate text-slate-400">{stripHtml(post.summary)}</p></div></div></td><td className="px-4 py-3">{post.category}</td><td className="px-4 py-3">{post.publishDate}</td><td className="px-4 py-3"><AdminSelect value={post.status} onChange={(value) => requestStatusChange(post, value as MediaPost["status"])} options={[{ value: "published", label: "Đã xuất bản" }, { value: "draft", label: "Bản nháp" }]} className={`min-w-36 [&>button]:font-bold ${post.status === "published" ? "[&>button]:border-emerald-200 [&>button]:bg-emerald-50 [&>button]:text-emerald-700" : "[&>button]:border-amber-200 [&>button]:bg-amber-50 [&>button]:text-amber-700"}`} searchable={false} showSelectionCheck={false} disabled={isChangingStatus} /></td><td className="px-4 py-3"><div className="space-y-1 leading-5"><p className="truncate font-semibold text-slate-800">{post.createdBy?.name ?? "Chưa có dữ liệu"}</p><p className="truncate text-slate-500">{post.createdBy?.email ?? "—"}</p><p className="text-[11px] text-slate-400">{formatCreatedAt(post.createdAt)}</p></div></td><td className="px-4 py-3"><div className="flex justify-center gap-3"><button type="button" onClick={() => onSelectPreview(post)} title="Xem"><Eye className="h-4 w-4" /></button><button type="button" onClick={() => onNavigateToEdit(post)} title="Sửa" className="text-emerald-600"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => setDeleteTarget(post)} title="Xóa vĩnh viễn" className="text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
      )}

      {totalPages > 1 && <div className="flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-40">Trước</button><span className="text-xs text-slate-500">Trang {page}/{totalPages}</span><button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold disabled:opacity-40">Sau</button></div>}

      {previewPost && <ArticleReaderModal key={previewPost.id} post={previewPost} onClose={() => onSelectPreview(null)} onEdit={() => onNavigateToEdit(previewPost)} onDelete={() => setDeleteTarget(previewPost)} />}

      {publishTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Eye className="h-6 w-6" /></div><h3 className="mt-4 text-lg font-bold text-slate-900">Xuất bản bài viết?</h3><p className="mt-2 text-sm leading-6 text-slate-500">“{publishTarget.title}” sẽ hiển thị trên trang tin tức công khai.</p><div className="mt-6 flex justify-center gap-2"><button type="button" onClick={() => setPublishTarget(null)} disabled={isChangingStatus} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button><button type="button" onClick={() => void changeStatus(publishTarget, "published")} disabled={isChangingStatus} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isChangingStatus ? "Đang xuất bản..." : "Xác nhận xuất bản"}</button></div></div></div>}

      {deleteTarget && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center"><Trash2 className="mx-auto h-10 w-10 text-rose-600" /><h3 className="mt-3 text-lg font-bold">Xóa vĩnh viễn bài viết?</h3><p className="mt-2 text-sm text-slate-500">“{deleteTarget.title}” sẽ bị xóa khỏi cơ sở dữ liệu và không thể khôi phục.</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Hủy</button><button type="button" onClick={() => void remove()} disabled={isDeleting} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}</button></div></div></div>}
    </div>
  );
}
