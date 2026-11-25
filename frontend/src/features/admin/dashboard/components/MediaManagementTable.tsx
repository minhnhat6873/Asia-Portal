"use client";

import Image from "next/image";
import { CalendarDays, ChevronDown, Clock3, Edit3, Eye, GraduationCap, Infinity as InfinityIcon, Megaphone, Newspaper, Trash2, UsersRound } from "lucide-react";
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import type { MediaPost } from "../types";
import { stripHtml } from "@/utils/stripHtml";

const CATEGORY_ICONS = {
  "Sự kiện": CalendarDays,
  "Tin tức": Newspaper,
  "Nhân sự": UsersRound,
  "Thông báo": Megaphone,
  "Đào Tạo": GraduationCap,
} satisfies Record<MediaPost["category"], typeof CalendarDays>;

export function mediaPublicationLabel(post: MediaPost): string {
  return post.status === "published"
    ? post.isExpired ? "Đang hiển thị (hết hạn)" : "Đang hiển thị"
    : post.hiddenReason === "expired" ? "Đã ẩn tự động" : "Ẩn tin";
}

function formatCreatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(date).replace(",", "");
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
  return <div className="overflow-x-auto overflow-y-hidden bg-white">
    <table className="w-full min-w-[1440px] border-collapse table-fixed text-left text-[13px] text-[#172B24]">
      <colgroup><col className="w-[36%]" /><col className="w-[19%]" /><col className="w-[19%]" /><col className="w-[18%]" /><col className="w-[8%]" /></colgroup>
      <thead className="border-b border-[#f0f3f6] bg-[#eef7f3] text-[14px] font-bold text-[#172B24] [&_th]:font-bold">
        <tr><th className="px-5 py-3">Bài viết</th><th className="whitespace-nowrap px-4 py-3">Ngày đăng / Thời hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Người tạo</th><th className="px-2 py-3 text-center">Thao tác</th></tr>
      </thead>
      <tbody className="divide-y divide-[#f0f3f6] bg-white">{posts.map((post) => {
        const permanent = Boolean(post.publishIndefinitely);
        const expired = !permanent && Boolean(post.isExpired);
        const published = post.status === "published";
        const CategoryIcon = CATEGORY_ICONS[post.category];
        return <tr key={post.id} className="align-middle transition-colors hover:bg-slate-50/70">
          <td className="px-5 py-3">
            <div className="flex min-w-0 items-center gap-4">
              <button type="button" onClick={() => onPreview(post)} aria-label={`Xem bài viết ${post.title}`} className="h-[88px] w-[124px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {post.coverImage && <Image src={post.coverImage} alt="" width={124} height={88} unoptimized className="h-full w-full object-cover" />}
              </button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onPreview(post)} className="line-clamp-2 text-left text-[14px] font-bold leading-5 text-[#172B24] hover:text-emerald-700">{post.title}</button>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] font-bold ${post.category === "Sự kiện" ? "border-orange-200 bg-orange-50 text-orange-600" : "border-green-200 bg-green-100/70 text-green-800"}`}>
                    <CategoryIcon size={16} aria-hidden="true" />{post.category}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[13px] font-normal leading-[19px] text-[#64748B]">{stripHtml(post.summary)}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <p className="text-[15px] font-bold leading-6 text-[#111827]">{post.publishDate}</p>
            <p className={`mt-2 flex items-center gap-1.5 whitespace-nowrap text-[14px] leading-5 ${expired ? "font-semibold text-rose-500" : "text-[#64748B]"}`}>
              {expired && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
              {permanent ? "Thời hạn: Không hết hạn" : post.expiryDate ? `Hết hạn: ${post.expiryDate}` : "Chưa đặt thời hạn"}
            </p>
            {permanent ? <span className="mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-[#e5faee] px-2.5 py-1.5 text-[13px] font-bold text-emerald-700"><InfinityIcon size={20} strokeWidth={2.5} /> Vĩnh viễn</span>
              : expired ? <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-[#fff7d9] px-3 py-1.5 text-[13px] font-semibold text-amber-700"><Clock3 size={17} /> Đã hết hạn</span> : null}
          </td>
          <td className="px-4 py-3">
            <Select aria-label={`Trạng thái bài viết ${post.title}`} selectedKey={!published && post.hiddenReason === "expired" ? null : post.status} onSelectionChange={(value) => { if (value === "published" || value === "draft") onStatusChange(post, value); }} isDisabled={!canPublish || changingStatus}>
              <Button className={`flex min-h-9 w-fit items-center justify-between gap-3 rounded-full border px-3 py-1.5 text-[13px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60 ${published ? "border-[#b6efc8] bg-[#e2fbe9] text-[#17752c]" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${published ? "bg-[#12852a]" : "bg-amber-500"}`} /><SelectValue>{mediaPublicationLabel(post)}</SelectValue></span><ChevronDown size={14} strokeWidth={2.5} className="shrink-0" />
              </Button>
              <Popover className="z-[90] min-w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" offset={6}>
                <ListBox className="outline-none">
                  <ListBoxItem id="published" textValue={expired ? "Đăng tin đã hết hạn" : "Đang hiển thị"} className="cursor-pointer rounded-lg px-3 py-2.5 text-[13px] font-semibold text-slate-700 outline-none data-[focused]:bg-emerald-50 data-[selected]:text-emerald-700">{expired ? "Đăng tin đã hết hạn" : "Đang hiển thị"}</ListBoxItem>
                  <ListBoxItem id="draft" textValue="Ẩn tin" className="cursor-pointer rounded-lg px-3 py-2.5 text-[13px] font-semibold text-slate-700 outline-none data-[focused]:bg-amber-50 data-[selected]:text-amber-700">Ẩn tin</ListBoxItem>
                </ListBox>
              </Popover>
            </Select>
          </td>
          <td className="px-4 py-3"><p className="break-words text-[14px] font-bold leading-5 text-[#111827]">{post.createdBy?.name ?? "Chưa có dữ liệu"}</p><p className="mt-1.5 break-words text-[14px] leading-5 text-[#64748B]">{post.createdBy?.email ?? "—"}</p><p className="mt-1.5 whitespace-nowrap text-[14px] leading-5 text-[#64748B]">{formatCreatedAt(post.createdAt)}</p></td>
          <td className="px-2 py-3"><div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => onPreview(post)} title="Xem bài viết" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><Eye size={22} /></button>
            <button type="button" hidden={!canEdit} onClick={() => onEdit(post)} title="Chỉnh sửa bài viết" className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50"><Edit3 size={22} /></button>
            <button type="button" hidden={!canDelete} onClick={() => onDelete(post)} title="Chuyển vào thùng rác" className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"><Trash2 size={22} /></button>
          </div></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
