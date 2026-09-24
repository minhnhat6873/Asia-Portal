import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Check, 
  RotateCcw, 
  FileText, 
  Calendar, 
  User, 
  Building, 
  Image, 
  Eye, 
  Layers, 
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { MediaPost, MediaCategory } from '../types';

interface AddMediaPageProps {
  onBack: () => void;
  onSave: (post: Omit<MediaPost, 'id'>) => void;
}

const CATEGORIES: MediaCategory[] = [
  'Nhân sự',
  'Tin tức',
  'Sự kiện',
  'Thông cáo báo chí',
  'Sản phẩm mới'
];

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80'
];

export const AddMediaPage: React.FC<AddMediaPageProps> = ({
  onBack,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Nhân sự' as MediaCategory,
    summary: '',
    content: '',
    coverImage: PRESET_COVERS[0],
    authorDepartment: 'Phòng Nhân Sự',
    publishDate: '01/09/2026',
    status: 'published' as 'published' | 'draft'
  });

  const [previewMode, setPreviewMode] = useState<'card' | 'full'>('card');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.summary.trim()) {
      setErrorMsg('Vui lòng nhập Tiêu đề bài viết và Tóm tắt ngắn.');
      return;
    }
    setErrorMsg(null);
    onSave({
      ...formData,
      content: formData.content.trim() || formData.summary.trim(),
    });
  };

  const handleReset = () => {
    setFormData({
      title: '',
      category: 'Nhân sự',
      summary: '',
      content: '',
      coverImage: PRESET_COVERS[0],
      authorDepartment: 'Phòng Nhân Sự',
      publishDate: '01/09/2026',
      status: 'published'
    });
    setErrorMsg(null);
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
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Hủy & Quay lại
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Đăng Bài Viết</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Balanced 2 Columns (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-7">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                Nội Dung Soạn Thảo
              </h2>
              <p className="text-xs text-slate-500">
                Nhập các thông số bài viết; bạn có thể xem trước dạng thẻ feed hoặc toàn bài ở cột bên phải.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              Biểu mẫu 2 cột cân đối
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Title (50%) | Category (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tiêu đề bài viết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Asia F&B khánh thành dây chuyền chiết rót tự động mới"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chuyên mục / Phân loại <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as MediaCategory })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Publish Date (50%) | Author Department (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày đăng bài (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={formData.publishDate}
                  onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  placeholder="22/09/2026"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Đơn vị / Phòng ban đăng tin
                </label>
                <input
                  type="text"
                  value={formData.authorDepartment}
                  onChange={(e) => setFormData({ ...formData, authorDepartment: e.target.value })}
                  placeholder="Phòng Marketing / Ban Truyền thông"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 3: Cover Image URL (50%) | Status (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Link ảnh bìa bài viết (Cover URL)
                </label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />

                {/* Quick preset covers */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Ảnh mẫu:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COVERS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, coverImage: url })}
                        className={`w-9 h-6 rounded-md overflow-hidden border transition-all ${
                          formData.coverImage === url ? 'ring-2 ring-sky-500 border-white scale-105' : 'border-slate-300 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Trạng thái xuất bản
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                >
                  <option value="published">Đã xuất bản (Công khai)</option>
                  <option value="draft">Bản nháp (Lưu nội bộ)</option>
                </select>
              </div>
            </div>

            {/* Row 4: Sapo Summary (50%) | Detailed Content (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tóm tắt ngắn (Sapo) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Đoạn văn ngắn 2-3 câu giới thiệu tổng quan về sự kiện hoặc thông tin quan trọng..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nội dung chi tiết bài viết
                </label>
                <textarea
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nội dung đầy đủ của bài viết, số liệu, lịch trình hoặc thông cáo báo chí..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Form actions at bottom */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Quay lại danh sách truyền thông
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Xuất Bản Bài Viết Này</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Bản Xem Trước Trực Quan (Live Preview)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Khớp 100% hình ảnh thực tế</span>
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
                  {formData.category || 'Nhân sự'}
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
              <p className="text-sm text-slate-500 leading-relaxed">
                {formData.summary || 'Á Châu trân trọng chào đón 5 thành viên mới gia nhập đại gia đình trong tháng 9/2026.'}
              </p>

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

              {/* Light Green / Mint Content Box */}
              <div className="bg-[#f0fdf4] border border-emerald-100/80 rounded-2xl p-4 text-xs md:text-sm text-emerald-900/90 leading-relaxed font-normal mt-2">
                {formData.content || formData.summary || 'Tháng 9/2026, Asia Food & Beverage hân hạnh chào đón 5 thành viên mới gia nhập đại gia đình. Đây là những tài năng trẻ được tuyển chọn kỹ lưỡng từ nhiều trường đại học hàng đầu và các doanh nghiệp lớn. Chúng tôi tin tưởng rằng với sự bổ sung này, Á Châu sẽ ngày càng phát triển và đạt được những mục tiêu đề ra.'}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Kiểm tra bài viết trước khi xuất bản
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition-colors"
                >
                  Xác Nhận Đăng
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
