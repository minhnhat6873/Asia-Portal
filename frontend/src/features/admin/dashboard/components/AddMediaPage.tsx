import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Calendar,
  User,
  AlertCircle,
  X
} from 'lucide-react';
import { MediaPost, MediaCategory } from '../types';
import { AdminSelect } from './AdminSelect';
import AvatarUploader from '@/components/ui/AvatarUploader';
import DatePicker from '@/components/ui/DatePicker';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { hasRichTextContent, RichText } from '@/components/ui/RichText';

interface AddMediaPageProps {
  onBack: () => void;
  onSave: (post: Omit<MediaPost, 'id'>) => void;
}

const CATEGORIES: MediaCategory[] = [
  'Sự kiện',
  'Tin tức',
  'Nhân sự',
  'Thông báo'
];

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80'
];

function toDatePickerValue(value: string): string {
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function fromDatePickerValue(value: string): string {
  const [year, month, day] = value.split('-');
  if (!day || !month || !year) return '';
  return `${day}/${month}/${year}`;
}

async function createStoredCoverImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const maxWidth = 1600;
    const maxHeight = 1200;
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể xử lý ảnh bìa.');

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.82);
  } finally {
    bitmap.close();
  }
}

export const AddMediaPage: React.FC<AddMediaPageProps> = ({
  onBack,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Thông báo' as MediaCategory,
    summary: '',
    content: '',
    coverImage: '',
    authorDepartment: 'Phòng HR&AD',
    publishDate: '01/09/2026',
    status: 'draft' as 'published' | 'draft'
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coverUploaderKey, setCoverUploaderKey] = useState(0);

  const handleCoverFileChange = async (file: File | null) => {
    if (!file) {
      setFormData((current) => ({ ...current, coverImage: '' }));
      return;
    }

    try {
      const coverImage = await createStoredCoverImage(file);
      setFormData((current) => ({ ...current, coverImage }));
      setErrorMsg(null);
    } catch {
      setErrorMsg('Không thể đọc ảnh bìa. Vui lòng chọn ảnh khác.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !hasRichTextContent(formData.summary)) {
      setErrorMsg('Vui lòng nhập Tiêu đề bài viết và Tóm tắt ngắn.');
      return;
    }
    setErrorMsg(null);
    onSave({
      ...formData,
      coverImage: formData.coverImage || PRESET_COVERS[0],
      content: formData.content.trim(),
    });
  };

  const handleReset = () => {
    setFormData({
      title: '',
      category: 'Thông báo',
      summary: '',
      content: '',
      coverImage: '',
      authorDepartment: 'Phòng HR&AD',
      publishDate: '01/09/2026',
      status: 'draft'
    });
    setErrorMsg(null);
    setCoverUploaderKey((current) => current + 1);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Quay lại danh sách truyền thông"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Soạn Thảo Bài Viết Mới
              </span>
              <span className="text-slate-400 text-xs">Asia F&B Media & Events</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Đăng Bài Truyền Thông & Xem Trước Trước Khi Xuất Bản
            </h1>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:flex-nowrap">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại form</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Lưu Bài Viết</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Form on Left (60%), Live Preview on Right (40%) */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6 items-start">
        {/* Left Form: Balanced 2 Columns (7 cols) */}
        <div className="2xl:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Title (50%) | Category (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Tiêu đề bài viết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Asia F&B khánh thành dây chuyền chiết rót tự động mới"
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Chuyên mục / Phân loại <span className="text-rose-500">*</span>
                </label>
                <AdminSelect value={formData.category} onChange={(category) => setFormData({ ...formData, category: category as MediaCategory })} options={CATEGORIES.map((value) => ({ value, label: value }))} className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
            </div>

            {/* Row 2: Publish Date (50%) | Author Department (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Ngày đăng bài (DD/MM/YYYY)
                </label>
                <DatePicker
                  value={toDatePickerValue(formData.publishDate)}
                  onChange={(value) => setFormData({ ...formData, publishDate: fromDatePickerValue(value) })}
                  ariaLabel="Ngày đăng bài"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Đơn vị / Phòng ban đăng tin
                </label>
                <select
                  value={formData.authorDepartment}
                  onChange={(e) => setFormData({ ...formData, authorDepartment: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                >
                  <option value="Phòng HR&AD">Phòng HR&AD</option>
                  <option value="Phòng MKT">Phòng MKT</option>
                </select>
              </div>
            </div>

            {/* Row 3: Cover image upload */}
            <AvatarUploader
              key={coverUploaderKey}
              onFileChange={handleCoverFileChange}
              label="Ảnh bìa bài viết"
              emptyHelperText="Kéo thả hoặc chọn ảnh JPEG, PNG, WebP (tối đa 5 MB). Ảnh hiển thị theo khung 4:3."
              selectedHelperText="Ảnh bìa đã sẵn sàng để lưu cùng bài viết."
              imageAlt="Xem trước ảnh bìa bài viết"
              pickerAriaLabel="Chọn ảnh bìa bài viết"
              removeAriaLabel="Bỏ ảnh bìa bài viết"
              changeLabel="Thay ảnh bìa"
            />

            {/* Row 4: Full-width Sapo followed by full-width detailed content */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Tóm tắt ngắn (Sapo) <span className="text-rose-500">*</span>
                </label>
                <RichTextEditor
                  value={formData.summary}
                  onChange={(summary) => setFormData({ ...formData, summary })}
                  placeholder="Đoạn văn ngắn 2-3 câu giới thiệu tổng quan về sự kiện hoặc thông tin quan trọng..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nội dung chi tiết bài viết
                </label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="Nội dung đầy đủ của bài viết, số liệu, lịch trình hoặc thông cáo báo chí..."
                />
              </div>
            </div>

          </form>
        </div>

        {/* Right Preview Panel (5 cols) — normal document flow like employee preview */}
        <div className="2xl:col-span-5">
          <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Bản Xem Trước Trực Quan (Live Preview)
              </span>
            </div>
          </div>

          {/* EXACT Match with User Image 2 */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm overflow-hidden">
            {/* Top Cover Image with Red Pill & Dark Circular Close Button */}
            <div className="relative w-full h-56 sm:h-64 bg-slate-100 overflow-hidden">
              <img
                src={formData.coverImage || PRESET_COVERS[0]}
                alt={formData.title || 'Cover preview'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRESET_COVERS[0];
                }}
                className="w-full h-full object-cover"
              />

              {/* Red Category Pill at Bottom-Left: Nhân sự / Tin tức / etc. */}
              <div className="absolute bottom-4 left-4">
                <span className="px-3.5 py-1 rounded-full bg-[#991b1b] text-white text-xs font-bold shadow-sm">
                  {formData.category || 'Thông báo'}
                </span>
              </div>

              {/* Circular Close X at Top-Right */}
              <button
                type="button"
                onClick={onBack}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-sm"
                title="Quay lại"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-3.5">
              {/* Title */}
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {formData.title || 'Chào mừng các thành viên mới tháng 9'}
              </h2>

              {/* Sapo / Short Description */}
              {hasRichTextContent(formData.summary) ? (
                <RichText
                  html={formData.summary}
                  className="text-sm text-slate-500 leading-relaxed [&_p]:my-0"
                />
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed">
                  Á Châu trân trọng chào đón 5 thành viên mới gia nhập đại gia đình trong tháng 9/2026.
                </p>
              )}

              {/* Subtle divider */}
              <div className="border-b border-slate-100 pt-1"></div>

              {/* Metadata with Icons: Date & Author Department */}
              <div className="space-y-2 text-sm text-slate-400 font-normal">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                  <span>{formData.publishDate || '01/09/2026'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                  <span>{formData.authorDepartment || 'Phòng Nhân Sự'}</span>
                </div>
              </div>

              {/* Detailed content is previewed only when its own field has data. */}
              {hasRichTextContent(formData.content) && (
                <RichText
                  html={formData.content}
                  className="bg-[#f0fdf4] border border-emerald-100/80 rounded-2xl p-4 text-xs md:text-sm text-emerald-900/90 leading-relaxed font-normal mt-2 [&_p]:my-0"
                />
              )}

            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
