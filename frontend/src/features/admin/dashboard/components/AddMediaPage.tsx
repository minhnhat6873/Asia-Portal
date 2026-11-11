"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Calendar, Check, RotateCcw, User } from "lucide-react";
import { parseDate } from "@internationalized/date";

import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import AvatarUploader from "@/components/ui/AvatarUploader";
import DatePicker from "@/components/ui/DatePicker";
import { hasRichTextContent, RichText } from "@/components/ui/RichText";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { ApiError } from "@/services/api";
import { createAdminMedia, getFeaturedSlots, updateAdminMedia, uploadAdminMediaContentImage, type FeaturedSlot } from "@/services/admin-media.service";
import type { MediaCategory, MediaPost } from "../types";
import { AdminSelect } from "./AdminSelect";
import UnsavedChangesDialog from "@/components/ui/UnsavedChangesDialog";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import { navigateWithUnsavedChangesGuard } from "@/lib/unsavedChangesNavigation";

interface AddMediaPageProps {
  mode?: "create" | "edit";
  initialPost?: MediaPost;
  onBack: () => void;
  onSave: (post: MediaPost) => void;
}

const CATEGORIES: MediaCategory[] = ["Sự kiện", "Tin tức", "Nhân sự", "Thông báo", "Đào Tạo"];
const AUTHOR_DEPARTMENTS = ["DESIGN", "MARKETING_COMMUNICATIONS", "HR_ADMIN"].map((code) => `Phòng ${getEmployeeDepartmentLabel(code)}`);

function initialAuthorDepartment(post?: MediaPost): string {
  if (!post) return `Phòng ${getEmployeeDepartmentLabel("HR_ADMIN")}`;
  const legacyLabels: Record<string, string> = {
    "Phòng Design": `Phòng ${getEmployeeDepartmentLabel("DESIGN")}`,
    "Phòng MKT": `Phòng ${getEmployeeDepartmentLabel("MARKETING_COMMUNICATIONS")}`,
    "Phòng HR&AD": `Phòng ${getEmployeeDepartmentLabel("HR_ADMIN")}`,
  };
  const department = legacyLabels[post.authorDepartment] ?? post.authorDepartment;
  return AUTHOR_DEPARTMENTS.includes(department) ? department : "";
}

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
    authorDepartment: initialAuthorDepartment(post),
    publishDate: toPickerDate(post?.publishDate),
    expiryDate: post?.expiryDate && !post.publishIndefinitely ? toPickerDate(post.expiryDate) : "",
    publishIndefinitely: post ? post.publishIndefinitely ?? !post.expiryDate : false,
    featured: post?.status === "published" && Boolean(post.featured),
    featuredSlot: post?.featuredSlot ? String(post.featuredSlot) : "",
  };
}

export function AddMediaPage({ mode = "create", initialPost, onBack, onSave }: AddMediaPageProps) {
  const [baseline] = useState(() => initialForm(initialPost));
  const [formData, setFormData] = useState(baseline);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [featuredHelpOpen, setFeaturedHelpOpen] = useState(false);
  const [featuredSlots, setFeaturedSlots] = useState<FeaturedSlot[]>([]);
  const [slotsError, setSlotsError] = useState("");
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [slotConflict, setSlotConflict] = useState<FeaturedSlot | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
  const featuredHelpRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const savingRef = useRef(false);
  useEffect(() => {
    if (mode !== "edit" || initialPost?.status !== "published") return;
    const controller = new AbortController();
    const refresh = () => { void getFeaturedSlots(controller.signal).then((slots) => { setFeaturedSlots(slots); setSlotsError(""); setSlotsLoaded(true); setSlotConflict((current) => current && slots.some((slot) => slot.slot === current.slot && slot.id === current.id) ? current : null); }).catch((error) => { if (!controller.signal.aborted) { setSlotsError(error instanceof Error ? error.message : "Không thể tải vị trí nổi bật."); setSlotsLoaded(false); } }); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [mode, initialPost?.status, slotRefresh]);
  useEffect(() => {
    if (!featuredHelpOpen) return;
    const dismiss = (event: MouseEvent) => { if (!featuredHelpRef.current?.contains(event.target as Node)) setFeaturedHelpOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFeaturedHelpOpen(false); };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", escape); };
  }, [featuredHelpOpen]);
  const hasChanges = coverFile !== null || coverRemoved || JSON.stringify(formData) !== JSON.stringify(baseline);
  const navigation = useUnsavedChanges(hasChanges, isSaving);
  const minimumExpiryDate = formData.publishDate ? parseDate(formData.publishDate).add({ days: 1 }).toString() : undefined;
  const invalidExpiryDate = Boolean(!formData.publishIndefinitely && formData.expiryDate && formData.publishDate && formData.expiryDate <= formData.publishDate);
  const currentSlot = formData.featured ? formData.featuredSlot || String(featuredSlots.find((slot) => slot.id === initialPost?.id)?.slot ?? "") : "";

  const previewUrl = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : "", [coverFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const reset = () => {
    setFormData(baseline);
    setCoverFile(null);
    setCoverRemoved(false);
    setErrorMsg(null);
    setUploaderKey((value) => value + 1);
  };

  const submit = async (event?: React.FormEvent): Promise<boolean> => {
    event?.preventDefault();
    if (savingRef.current) return false;
    if (formData.featured && (!slotsLoaded || !currentSlot)) {
      setErrorMsg("Vui lòng tải và chọn vị trí nổi bật trước khi lưu.");
      return false;
    }
    const occupied = featuredSlots.find((slot) => slot.slot === Number(currentSlot) && slot.id !== initialPost?.id);
    if (formData.featured && occupied) { setSlotConflict(occupied); return false; }
    if (!AUTHOR_DEPARTMENTS.includes(formData.authorDepartment)) {
      setErrorMsg("Vui lòng chọn phòng Thiết kế, Marketing & Truyền thông hoặc Nhân sự & Hành chính.");
      return false;
    }
    if (!formData.publishDate) {
      setErrorMsg("Vui lòng chọn ngày đăng.");
      return false;
    }
    if (invalidExpiryDate) {
      setErrorMsg("Ngày hết hạn phải sau ngày đăng ít nhất 1 ngày.");
      return false;
    }
    if (!formData.publishIndefinitely && !formData.expiryDate) {
      setErrorMsg("Vui lòng chọn ngày hết hạn.");
      return false;
    }
    if (!formData.title.trim() || !hasRichTextContent(formData.summary)) {
      setErrorMsg("Vui lòng nhập Tiêu đề bài viết và Tóm tắt ngắn.");
      return false;
    }

    savingRef.current = true;
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
        expiryDate: formData.publishIndefinitely ? null : toDisplayDate(formData.expiryDate),
        publishIndefinitely: formData.publishIndefinitely,
        featured: formData.featured,
        ...(formData.featured ? { featuredSlot: Number(currentSlot) } : {}),
        ...(mode === "create" ? { status: "draft" as const } : {}),
        ...(coverRemoved ? { coverImage: "" } : {}),
      };
      const saved = mode === "edit" && initialPost
        ? await updateAdminMedia(initialPost.id, input, coverFile)
        : await createAdminMedia(input, coverFile);
      onSave(saved);
      await navigation.leave(onBack);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.fieldErrors.featuredSlot) {
        try {
          const slots = await getFeaturedSlots();
          setFeaturedSlots(slots);
          setSlotConflict(slots.find((slot) => slot.slot === Number(currentSlot) && slot.id !== initialPost?.id) ?? null);
        } catch { setSlotsError("Không thể tải vị trí nổi bật. Vui lòng thử lại."); setSlotsLoaded(false); }
      }
      setErrorMsg(error instanceof ApiError ? error.errors[0] ?? error.message : error instanceof Error ? error.message : "Không thể lưu bài viết.");
      return false;
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const visibleCover = previewUrl || (!coverRemoved ? formData.coverImage : "");

  return (
    <div className="space-y-6 pb-12">
      <UnsavedChangesDialog open={navigation.isPromptOpen} saving={isSaving}
        description="Bạn muốn lưu thay đổi trước khi rời trang bài viết?"
        onContinue={navigation.cancelNavigation}
        onDiscard={() => { void navigation.leave(onBack); }}
        onSave={() => { void submit().then((saved) => { if (!saved) navigation.cancelNavigation(); }); }}
      />
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigateWithUnsavedChangesGuard(onBack)} aria-label="Quay lại danh sách bài viết" className="rounded-2xl bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200"><ArrowLeft className="h-5 w-5" /></button>
          <div><p className="text-xs font-semibold text-sky-700">Asia F&amp;B Media &amp; Events</p><h1 className="text-xl font-extrabold text-slate-900">{mode === "edit" ? "Chỉnh sửa bài viết" : "Đăng bài truyền thông mới"}</h1></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "create" && <button type="button" onClick={reset} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"><RotateCcw className="h-4 w-4" />Đặt lại form</button>}
          <button type="button" onClick={submit} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-60"><Check className="h-4 w-4" />{isSaving ? "Đang lưu..." : "Lưu bài viết"}</button>
        </div>
      </div>

      {errorMsg && <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{errorMsg}</div>}

      <div className="grid items-start gap-6 min-[1440px]:grid-cols-12">
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 min-w-0 min-[1440px]:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">Tiêu đề bài viết *<input required minLength={5} maxLength={200} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-sky-500" /></label>
            <div><label className="text-sm font-bold text-slate-700">Chuyên mục *</label><AdminSelect value={formData.category} onChange={(value) => setFormData({ ...formData, category: value as MediaCategory })} options={CATEGORIES.map((value) => ({ value, label: value }))} className="mt-1.5 w-full" searchable={false} showSelectionCheck={false} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-bold text-slate-700">Ngày đăng</label><DatePicker value={formData.publishDate} onChange={(publishDate) => setFormData({ ...formData, publishDate })} ariaLabel="Ngày đăng bài" /></div>
            <div className={formData.publishIndefinitely ? "opacity-50" : ""}>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">Ngày hết hạn {!formData.publishIndefinitely && <span className="text-rose-500">*</span>}</label>
              <DatePicker value={formData.expiryDate} minValue={minimumExpiryDate} disabled={formData.publishIndefinitely} onChange={(expiryDate) => setFormData({ ...formData, expiryDate })} ariaLabel={formData.publishIndefinitely ? "Ngày hết hạn không áp dụng cho tin vĩnh viễn" : "Ngày hết hạn bài (bắt buộc)"} />
              {invalidExpiryDate && <p role="alert" className="mt-1.5 text-sm text-rose-600">Ngày hết hạn phải sau ngày đăng ít nhất 1 ngày.</p>}
              <p className="mt-1.5 text-xs text-slate-500">{formData.publishIndefinitely ? "Tin vĩnh viễn không có ngày hết hạn." : "Bắt buộc chọn ngày hết hạn nếu không đăng vĩnh viễn."}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">Đơn vị / Phòng ban<select required value={formData.authorDepartment} onChange={(e) => setFormData({ ...formData, authorDepartment: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium">{!formData.authorDepartment && <option value="" disabled>Chọn phòng ban</option>}{AUTHOR_DEPARTMENTS.map((department) => <option key={department} value={department}>{getEmployeeDepartmentLabel(department)}</option>)}</select></label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={formData.publishIndefinitely} onChange={(event) => setFormData({ ...formData, publishIndefinitely: event.target.checked, expiryDate: "" })} className="h-5 w-5 shrink-0 rounded border-slate-300 accent-emerald-700" />Đăng tin vĩnh viễn</label>
            <div className="relative min-w-0">
              <div className="mb-1.5 flex items-center gap-1 text-sm font-bold text-slate-700"><span id="featured-slot-label">Vị trí bài nổi bật</span>
              <div ref={featuredHelpRef} className="relative shrink-0">
                <button type="button" aria-label="Hướng dẫn bài đăng nổi bật" aria-expanded={featuredHelpOpen} aria-controls="featured-help" onClick={() => setFeaturedHelpOpen((open) => !open)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600"><AlertCircle aria-hidden="true" className="h-5 w-5" /></button>
                {featuredHelpOpen && <div id="featured-help" role="note" className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-emerald-100 bg-white p-4 text-sm font-normal leading-6 text-slate-700 shadow-lg">Chọn một vị trí trống từ 1 đến 5 cho bài đang hiển thị. Nếu vị trí đã có bài, hãy mở bài đó và tắt nổi bật trước. Bài bị ẩn hoặc tự hết hạn sẽ tự giải phóng vị trí.</div>}
              </div>
              </div>
              <select aria-labelledby="featured-slot-label" disabled={mode === "create" || initialPost?.status !== "published" || !slotsLoaded} value={currentSlot} onChange={(event) => { const value = event.target.value; const occupied = featuredSlots.find((slot) => slot.slot === Number(value) && slot.id !== initialPost?.id); if (occupied) { setSlotConflict(occupied); return; } setSlotConflict(null); setFormData((current) => ({ ...current, featured: Boolean(value), featuredSlot: value })); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50">
                <option value="">Không nổi bật</option>
                {[1, 2, 3, 4, 5].map((number) => { const owner = featuredSlots.find((slot) => slot.slot === number && slot.id !== initialPost?.id); return <option key={number} value={number}>Vị trí {number}{owner ? " — Đã có bài" : ""}</option>; })}
              </select>
              {(mode === "create" || initialPost?.status !== "published") && <p className="mt-1 text-xs text-slate-500">Đăng bài trước để chọn vị trí nổi bật.</p>}
              {slotsError && <p role="alert" className="mt-1 text-xs text-rose-600">{slotsError} <button type="button" onClick={() => setSlotRefresh((value) => value + 1)} className="underline">Thử lại</button></p>}
              {slotConflict && <div role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Vị trí {slotConflict.slot} đang được dùng bởi “{slotConflict.title}”. Hãy tắt nổi bật ở bài đó trước. <a href={`/admin/media/${encodeURIComponent(slotConflict.id)}/edit`} target="_blank" rel="noopener noreferrer" className="mt-2 block font-bold underline">Mở bài viết để chỉnh sửa ↗</a></div>}
            </div>
          </div>
          <AvatarUploader key={uploaderKey} inputId="media-cover-upload" inputName="coverImage" initialAvatarUrl={coverRemoved ? "" : formData.coverImage} onFileChange={(file) => { setCoverFile(file); if (file) setCoverRemoved(false); }} onExistingAvatarRemove={() => setCoverRemoved(true)} label="Ảnh bìa" emptyHelperText="Thả tệp vào đây hoặc duyệt. JPEG, PNG, WebP tối đa 5 MB; khung 4:3." selectedHelperText="Ảnh bìa mới đã sẵn sàng." existingHelperText="Đang giữ ảnh bìa hiện tại." imageAlt="Xem trước ảnh bìa" changeLabel="Thay ảnh bìa" />
          <div><label className="mb-1.5 block text-sm font-bold text-slate-700">Tóm tắt ngắn (Sapo) *</label><RichTextEditor value={formData.summary} onChange={(summary) => setFormData({ ...formData, summary })} placeholder="Nhập tóm tắt bài viết..." enableImageInsert uploadImage={uploadAdminMediaContentImage} /></div>
          <div><label className="mb-1.5 block text-sm font-bold text-slate-700">Nội dung chi tiết</label><RichTextEditor value={formData.content} onChange={(content) => setFormData({ ...formData, content })} placeholder="Nhập nội dung chi tiết..." enableImageInsert uploadImage={uploadAdminMediaContentImage} /></div>
        </form>

        <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm min-w-0 min-[1440px]:col-span-5">
          <div className="relative aspect-[4/3] bg-slate-100">{visibleCover ? <img src={visibleCover} alt={formData.title || "Ảnh xem trước"} className="h-full w-full object-cover" /> : null}<span className="absolute bottom-4 left-4 rounded-full bg-rose-800 px-3.5 py-1 text-xs font-bold text-white">{formData.category}</span></div>
          <div className="space-y-4 p-6"><h2 className="text-2xl font-black text-slate-900">{formData.title || "Tiêu đề bài viết"}</h2>{hasRichTextContent(formData.summary) && <RichText html={formData.summary} className="rich-content text-sm text-slate-500" />}<div className="border-t border-slate-100 pt-3 text-sm text-slate-400"><p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{toDisplayDate(formData.publishDate)}</p><p className="mt-2 flex items-center gap-2"><User className="h-4 w-4" />{getEmployeeDepartmentLabel(formData.authorDepartment)}</p></div>{hasRichTextContent(formData.content) && <RichText html={formData.content} className="rich-content rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950" />}</div>
        </aside>
      </div>
    </div>
  );
}
