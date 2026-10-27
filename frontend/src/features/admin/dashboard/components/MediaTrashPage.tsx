"use client";

import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/services/api";
import { getDeletedAdminMedia, permanentlyDeleteAdminMedia, restoreAdminMedia } from "@/services/admin-media.service";
import { useAdminPermissions } from "@/lib/adminPermissions";
import type { MediaPost } from "../types";

const PAGE_SIZE = 20;
function deletedDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(date);
}

export function MediaTrashPage({ onBack, onChanged }: { onBack: () => void; onChanged: () => void | Promise<void> }) {
  const { can } = useAdminPermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [confirmation, setConfirmation] = useState<{ post: MediaPost; action: "restore" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const result = await getDeletedAdminMedia({ search: search.trim() || undefined, page, limit: PAGE_SIZE }, signal);
      if (signal?.aborted) return;
      const lastPage = Math.max(1, Math.ceil(result.pagination.total / PAGE_SIZE));
      if (page > lastPage) { setPage(lastPage); return; }
      setPosts(result.items);
      setTotal(result.pagination.total);
      setError("");
    } catch (cause) {
      if (signal?.aborted) return;
      setPosts([]);
      setTotal(0);
      setError(cause instanceof Error ? cause.message : "Không thể tải thùng rác truyền thông.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, search]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal); }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [load, refresh]);

  useEffect(() => {
    if (confirmation) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirmation]);

  const confirm = async () => {
    if (!confirmation || busyRef.current || !can("media:trash")) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { post, action } = confirmation;
      if (action === "restore") await restoreAdminMedia(post.id);
      else await permanentlyDeleteAdminMedia(post.id);
      toast.success(action === "restore" ? "Đã khôi phục bài viết về trạng thái Ẩn tin." : "Đã xóa vĩnh viễn bài viết.");
      setConfirmation(null);
      await load();
      await onChanged();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) { setConfirmation(null); await load(); }
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        setPosts([]);
        setTotal(0);
        setConfirmation(null);
        setError(cause.message);
      }
      toast.error(cause instanceof Error ? cause.message : "Không thể thực hiện thao tác. Vui lòng thử lại.");
    } finally { busyRef.current = false; setBusy(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const restoring = confirmation?.action === "restore";
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div><button type="button" onClick={onBack} disabled={busy} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowLeft size={17} />{can("media:view") ? "Quay lại truyền thông" : "Tài khoản của tôi"}</button><p className="mt-2 text-sm text-slate-500">Bài trong thùng rác không hiển thị công khai. Khôi phục sẽ đưa bài về Ẩn tin.</p></div>
      <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:w-80"><Search size={17} className="shrink-0 text-slate-400" /><input value={search} disabled={busy} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Tìm trong thùng rác truyền thông" placeholder="Tìm tiêu đề hoặc Sapo..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
    </div>
    <section className="overflow-hidden rounded-2xl border border-[#edf1f4] bg-white">
      {error ? <div role="alert" className="p-10 text-center text-sm text-rose-700"><p>{error}</p><button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-3 font-semibold underline">Thử lại</button></div>
        : loading ? <p role="status" className="p-12 text-center text-sm text-slate-500">Đang tải thùng rác...</p>
        : !posts.length ? <p className="p-12 text-center text-sm text-slate-500">{search.trim() ? "Không có bài viết phù hợp." : "Thùng rác chưa có bài viết."}</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-600"><tr><th className="px-5 py-4">Bài viết</th><th className="px-4 py-4">Chuyên mục</th><th className="px-4 py-4">Người xóa / Thời gian</th><th className="px-4 py-4 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{posts.map((post) => <tr key={post.id} className="hover:bg-slate-50/60">
            <td className="max-w-md px-5 py-4"><div className="flex items-center gap-3">{post.coverImage && <Image src={post.coverImage} alt="" width={88} height={66} unoptimized className="h-[66px] w-[88px] shrink-0 rounded-lg object-cover" />}<div><p className="line-clamp-2 font-bold text-slate-900">{post.title}</p><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">Đã chuyển vào thùng rác</span></div></div></td>
            <td className="px-4 py-4 text-slate-600">{post.category}</td><td className="px-4 py-4"><p className="font-medium text-slate-800">{post.deletedBy?.name ?? "Chưa có dữ liệu"}</p><p className="mt-1 text-slate-400">{deletedDate(post.deletedAt)}</p></td>
            <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" disabled={busy || !can("media:trash")} onClick={() => setConfirmation({ post, action: "restore" })} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 disabled:opacity-50"><RotateCcw size={15} />Khôi phục</button><button type="button" disabled={busy || !can("media:trash")} onClick={() => setConfirmation({ post, action: "delete" })} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-600 disabled:opacity-50"><Trash2 size={15} />Xóa vĩnh viễn</button></div></td>
          </tr>)}</tbody>
        </table></div>}
      {!error && total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><p>{total} bài viết trong thùng rác · Trang {page} / {totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading || busy} onClick={() => setPage((value) => value - 1)} aria-label="Trang trước" className="rounded-full border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><button type="button" disabled={page >= totalPages || loading || busy} onClick={() => setPage((value) => value + 1)} aria-label="Trang sau" className="rounded-full border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>}
    </section>
    <dialog ref={dialog} aria-labelledby="media-trash-confirm-title" onCancel={(event) => { event.preventDefault(); if (!busy) setConfirmation(null); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/50">
      <h2 id="media-trash-confirm-title" className="text-lg font-bold text-slate-900">{restoring ? "Khôi phục bài viết?" : "Xóa vĩnh viễn bài viết?"}</h2>
      <p className="mt-3 break-words text-sm font-semibold text-slate-700">{confirmation?.post.title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{restoring ? "Bài viết sẽ được khôi phục về Ẩn tin. Người có quyền đăng tin cần kiểm tra thời hạn và đăng lại khi phù hợp." : "Bài viết sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác."}</p>
      <div className="mt-6 flex justify-end gap-3"><button type="button" autoFocus disabled={busy} onClick={() => setConfirmation(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">Hủy</button><button type="button" disabled={busy} onClick={() => void confirm()} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${restoring ? "bg-emerald-600" : "bg-rose-600"}`}>{busy && <LoaderCircle size={16} className="animate-spin" />}{busy ? "Đang xử lý..." : restoring ? "Khôi phục" : "Xóa vĩnh viễn"}</button></div>
    </dialog>
  </div>;
}
