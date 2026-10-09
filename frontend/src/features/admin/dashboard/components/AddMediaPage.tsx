"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Calendar, Check, RotateCcw, User } from "lucide-react";

import AvatarUploader from "@/components/ui/AvatarUploader";
import DatePicker from "@/components/ui/DatePicker";
import { hasRichTextContent, RichText } from "@/components/ui/RichText";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { ApiError } from "@/services/api";
import { createAdminMedia, updateAdminMedia, uploadAdminMediaContentImage } from "@/services/admin-media.service";
import type { MediaCategory, MediaPost } from "../types";
import { AdminSelect } from "./AdminSelect";

interface AddMediaPageProps {
  mode?: "create" | "edit";
  initialPost?: MediaPost;
  onBack: () => void;
  onSave: (post: MediaPost) => void;
}

const CATEGORIES: MediaCategory[] = ["Sự kiện", "Tin tức", "Nhân sự", "Thông báo"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toPickerDate(value?: string): string {
  if (!value) return today();
  const [day, month, year] = value.split("/");
  return day && month && year ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : value.slice(0, 10);
}

function toDisplayDate(value: string): string {
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function initialForm(post?: MediaPost) {
  return {
    title: post?.title ?? "",
    category: post?.category ?? ("Thông báo" as MediaCategory),
    summary: post?.summary ?? "",
    content: post?.content ?? "",
    coverImage: post?.coverImage ?? "",
    authorDepartment: post?.authorDepartment ?? "Phòng HR&AD",
    publishDate: toPickerDate(post?.publishDate),
  };
}

export function AddMediaPage({ mode = "create", initialPost, onBack, onSave }: AddMediaPageProps) {
  const [formData, setFormData] = useState(() => initialForm(initialPost));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewUrl = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : "", [coverFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const reset = () => {
    setFormData(initialForm(initialPost));
    setCoverFile(null);
    setCoverRemoved(false);
    setErrorMsg(null);
    setUploaderKey((value) => value + 1);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.title.trim() || !hasRichTextContent(formData.summary)) {
      setErrorMsg("Vui lòng nhập Tiêu đề bài viết và Tóm tắt ngắn.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const input = {
        title: formData.title.trim(),
        category: formData.category,
        summary: formData.summary,
        content: formData.content,
        authorDepartment: formData.authorDepartment,
        publishDate: toDisplayDate(formData.publishDate),
        ...(mode === "create" ? { status: "draft" as const } : {}),
        ...(coverRemoved ? { coverImage: "" } : {}),
      };
      const saved = mode === "edit" && initialPost
        ? await updateAdminMedia(initialPost.id, input, coverFile)
        : await createAdminMedia(input, coverFile);
      onSave(saved);
    } catch (error) {
      setErrorMsg(error instanceof ApiError ? error.errors[0] ?? error.message : error instanceof Error ? error.message : "Không thể lưu bài viết.");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleCover = previewUrl || (!coverRemoved ? formData.coverImage : "");

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-2xl bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200"><ArrowLeft className="h-5 w-5" /></button>
          <div><p className="text-xs font-semibold text-sky-700">Asia F&amp;B Media &amp; Events</p><h1 className="text-xl font-extrabold text-slate-900">{mode === "edit" ? "Chỉnh sửa bài viết" : "Đăng bài truyền thông mới"}</h1></div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"><RotateCcw className="h-4 w-4" />Đặt lại form</button>
          <button type="button" onClick={submit} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-60"><Check className="h-4 w-4" />{isSaving ? "Đang lưu..." : "Lưu bài viết"}</button>
        </div>
      </div>

      {errorMsg && <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}

      <div className="grid items-start gap-6 2xl:grid-cols-12">
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 2xl:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">Tiêu đề bài viết *<input required minLength={5} maxLength={200} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-sky-500" /></label>
            <div><label className="text-sm font-bold text-slate-700">Chuyên mục *</label><AdminSelect value={formData.category} onChange={(value) => setFormData({ ...formData, category: value as MediaCategory })} options={CATEGORIES.map((value) => ({ value, label: value }))} className="mt-1.5 w-full" searchable={false} showSelectionCheck={false} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-bold text-slate-700">Ngày đăng</label><DatePicker value={formData.publishDate} onChange={(publishDate) => setFormData({ ...formData, publishDate })} ariaLabel="Ngày đăng bài" /></div>
            <label className="text-sm font-bold text-slate-700">Đơn vị / Phòng ban<select value={formData.authorDepartment} onChange={(e) => setFormData({ ...formData, authorDepartment: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"><option>Phòng HR&amp;AD</option><option>Phòng MKT</option></select></label>
          </div>
          <AvatarUploader key={uploaderKey} inputId="media-cover-upload" inputName="coverImage" initialAvatarUrl={coverRemoved ? "" : formData.coverImage} onFileChange={(file) => { setCoverFile(file); if (file) setCoverRemoved(false); }} onExistingAvatarRemove={() => setCoverRemoved(true)} label="Ảnh bìa" emptyHelperText="Thả tệp vào đây hoặc duyệt. JPEG, PNG, WebP tối đa 5 MB; khung 4:3." selectedHelperText="Ảnh bìa mới đã sẵn sàng." existingHelperText="Đang giữ ảnh bìa hiện tại." imageAlt="Xem trước ảnh bìa" changeLabel="Thay ảnh bìa" />
          <div><label className="mb-1.5 block text-sm font-bold text-slate-700">Tóm tắt ngắn (Sapo) *</label><RichTextEditor value={formData.summary} onChange={(summary) => setFormData({ ...formData, summary })} placeholder="Nhập tóm tắt bài viết..." enableImageInsert uploadImage={uploadAdminMediaContentImage} /></div>
          <div><label className="mb-1.5 block text-sm font-bold text-slate-700">Nội dung chi tiết</label><RichTextEditor value={formData.content} onChange={(content) => setFormData({ ...formData, content })} placeholder="Nhập nội dung chi tiết..." enableImageInsert uploadImage={uploadAdminMediaContentImage} /></div>
        </form>

        <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm 2xl:col-span-5">
          <div className="relative aspect-[4/3] bg-slate-100">{visibleCover ? <img src={visibleCover} alt={formData.title || "Ảnh xem trước"} className="h-full w-full object-cover" /> : null}<span className="absolute bottom-4 left-4 rounded-full bg-rose-800 px-3.5 py-1 text-xs font-bold text-white">{formData.category}</span></div>
          <div className="space-y-4 p-6"><h2 className="text-2xl font-black text-slate-900">{formData.title || "Tiêu đề bài viết"}</h2>{hasRichTextContent(formData.summary) && <RichText html={formData.summary} className="rich-content text-sm text-slate-500" />}<div className="border-t border-slate-100 pt-3 text-sm text-slate-400"><p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{toDisplayDate(formData.publishDate)}</p><p className="mt-2 flex items-center gap-2"><User className="h-4 w-4" />{formData.authorDepartment}</p></div>{hasRichTextContent(formData.content) && <RichText html={formData.content} className="rich-content rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950" />}</div>
        </aside>
      </div>
    </div>
  );
}
