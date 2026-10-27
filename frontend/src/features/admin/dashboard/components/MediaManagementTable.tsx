"use client";

import Image from "next/image";
import { ChevronDown, Clock3, Edit3, Eye, Infinity as InfinityIcon, Trash2 } from "lucide-react";
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import type { MediaPost } from "../types";
import { stripHtml } from "@/utils/stripHtml";

export function mediaPublicationLabel(post: MediaPost): string {
  return post.status === "published" ? "Đang hiển thị" : post.isExpired ? "Đã ẩn tự động" : "Ẩn tin";
}

function formatCreatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default function MediaManagementTable({ posts, canPublish, canEdit, canDelete, changingStatus, onStatusChange, onPreview, onEdit, onDelete }: {
  posts: MediaPost[];
  canPublish: boolean;
  canEdit: boolean;
  canDelete: boolean;
  changingStatus: boolean;
  onStatusChange: (post: MediaPost, status: MediaPost["status"]) => void;
  onPreview: (post: MediaPost) => void;
  onEdit: (post: MediaPost) => void;
  onDelete: (post: MediaPost) => void;
}) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[1360px] table-fixed text-left text-[13px] text-slate-700">
      <colgroup><col className="w-[31%]" /><col className="w-[10%]" /><col className="w-[17%]" /><col className="w-[16%]" /><col className="w-[17%]" /><col className="w-[9%]" /></colgroup>
      <thead className="border-b border-[#f0f3f6] bg-slate-50/80 text-[13px] font-semibold text-slate-600">
        <tr><th className="px-5 py-4">Bài viết</th><th className="px-4 py-4">Chuyên mục</th><th className="whitespace-nowrap px-4 py-4">Ngày đăng / Thời hạn</th><th className="px-4 py-4">Trạng thái</th><th className="px-4 py-4">Người tạo</th><th className="px-2 py-4 text-center">Thao tác</th></tr>
      </thead>
      <tbody className="divide-y divide-[#f0f3f6]">{posts.map((post) => {
        const permanent = Boolean(post.publishIndefinitely);
        const expired = !permanent && Boolean(post.isExpired);
        const published = post.status === "published";
        return <tr key={post.id} className="align-middle transition-colors hover:bg-slate-50/70">
          <td className="px-5 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <button type="button" onClick={() => onPreview(post)} aria-label={`Xem bài viết ${post.title}`} className="h-[108px] w-[144px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {post.coverImage && <Image src={post.coverImage} alt="" width={144} height={108} unoptimized className="h-full w-full object-cover" />}
              </button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onPreview(post)} className="line-clamp-2 text-left text-[15px] font-bold leading-[22px] text-slate-900 hover:text-emerald-700">{post.title}</button>
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-5 text-slate-400">{stripHtml(post.summary)}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-4"><span className="inline-flex whitespace-nowrap rounded-full bg-[#e5faee] px-4 py-2 text-[13px] font-medium text-emerald-700">{post.category}</span></td>
          <td className="px-4 py-4">
            <p className="font-medium text-slate-700">{post.publishDate}</p>
            <p className={`mt-2 flex items-center gap-1.5 whitespace-nowrap text-[13px] ${expired ? "font-medium text-rose-500" : "text-slate-400"}`}>
              {expired && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />}
              {permanent ? "Thời hạn: Không hết hạn" : post.expiryDate ? `Hết hạn: ${post.expiryDate}` : "Chưa đặt thời hạn"}
            </p>
            {permanent ? <span className="mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-[#e5faee] px-2.5 py-1.5 text-[13px] font-bold text-emerald-700"><InfinityIcon size={20} strokeWidth={2.5} /> Vĩnh viễn</span>
              : expired ? <span className="mt-2 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[13px] font-semibold text-amber-700"><Clock3 size={17} /> Đã hết hạn</span> : null}
          </td>
          <td className="px-4 py-4">
            <Select aria-label={`Trạng thái bài viết ${post.title}`} selectedKey={post.status} onSelectionChange={(value) => onStatusChange(post, value as MediaPost["status"])} isDisabled={!canPublish || changingStatus}>
              <Button className={`flex min-h-9 w-fit items-center justify-between gap-2 rounded-full border px-2.5 py-1.5 text-[13px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60 ${published ? "border-emerald-200 bg-[#eafbf2] text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${published ? "bg-emerald-700" : "bg-amber-500"}`} /><SelectValue /></span><ChevronDown size={14} strokeWidth={2.5} className="shrink-0" />
              </Button>
              <Popover className="z-[90] min-w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" offset={6}>
                <ListBox className="outline-none">
                  <ListBoxItem id="published" textValue="Đang hiển thị" className="cursor-pointer rounded-lg px-3 py-2.5 text-[13px] font-semibold text-slate-700 outline-none data-[focused]:bg-emerald-50 data-[selected]:text-emerald-700">Đang hiển thị</ListBoxItem>
                  <ListBoxItem id="draft" textValue={expired ? "Đã ẩn tự động" : "Ẩn tin"} className="cursor-pointer rounded-lg px-3 py-2.5 text-[13px] font-semibold text-slate-700 outline-none data-[focused]:bg-amber-50 data-[selected]:text-amber-700">{expired ? "Đã ẩn tự động" : "Ẩn tin"}</ListBoxItem>
                </ListBox>
              </Popover>
            </Select>
          </td>
          <td className="px-4 py-4"><p className="break-words font-medium leading-5 text-slate-800">{post.createdBy?.name ?? "Chưa có dữ liệu"}</p><p className="mt-1 break-all text-[13px] leading-5 text-slate-400">{post.createdBy?.email ?? "—"}</p><p className="mt-2 text-[13px] text-slate-400">{formatCreatedAt(post.createdAt)}</p></td>
          <td className="px-2 py-4"><div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => onPreview(post)} title="Xem bài viết" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><Eye size={22} /></button>
            <button type="button" hidden={!canEdit} onClick={() => onEdit(post)} title="Chỉnh sửa bài viết" className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50"><Edit3 size={22} /></button>
            <button type="button" hidden={!canDelete} onClick={() => onDelete(post)} title="Chuyển vào thùng rác" className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"><Trash2 size={22} /></button>
          </div></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
