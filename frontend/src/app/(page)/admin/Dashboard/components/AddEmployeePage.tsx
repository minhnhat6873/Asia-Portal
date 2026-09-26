import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Check, 
  RotateCcw, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building, 
  Cake, 
  Eye, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Employee, EmployeeStatus } from '../types';
import { AdminSelect } from './AdminSelect';
import { DEPARTMENTS } from '@/config/departments';

interface AddEmployeePageProps {
  onBack: () => void;
  onSave: (employee: Omit<Employee, 'id'>) => void;
  existingCount: number;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
];

export const AddEmployeePage: React.FC<AddEmployeePageProps> = ({
  onBack,
  onSave,
  existingCount,
}) => {
  const nextCodeNum = String(existingCount + 1).padStart(4, '0');
  const defaultCode = `ACF${nextCodeNum}`;

  const [formData, setFormData] = useState({
    code: defaultCode,
    fullName: '',
    position: '',
    department: 'Phòng IT',
    status: 'active' as EmployeeStatus,
    joinDate: '22/09/2026',
    birthDate: '15/08/1996',
    location: 'Văn Phòng Á Châu Dĩ An',
    email: '',
    phone: '',
    avatar: PRESET_AVATARS[0],
    bio: ''
  });

  // State for interactive tab inside the Live Preview card: 'info' | 'bio'
  const [previewTab, setPreviewTab] = useState<'info' | 'bio'>('info');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.code.trim() || !formData.position.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Mã nhân viên, Họ và tên và Chức vụ.');
      return;
    }
    setErrorMsg(null);
    onSave({
      ...formData,
      email: formData.email.trim() || `${formData.code.toLowerCase()}@asia-food.com`,
      phone: formData.phone.trim() || '0901 000 000',
      bio: formData.bio.trim() || `Nhân sự phụ trách ${formData.position} tại ${formData.department}, trực thuộc văn phòng ${formData.location}.`
    });
  };

  const handleReset = () => {
    setFormData({
      code: defaultCode,
      fullName: '',
      position: '',
      department: 'Phòng IT',
      status: 'active',
      joinDate: '22/09/2026',
      birthDate: '15/08/1996',
      location: 'Văn Phòng Á Châu Dĩ An',
      email: '',
      phone: '',
      avatar: PRESET_AVATARS[0],
      bio: ''
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
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Thêm Nhân Sự Mới
              </span>
              <span className="text-slate-400 text-xs">Asia F&B Beverage</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Hồ Sơ Nhân Sự & Xem Trước Trực Quan
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Lưu Nhân Viên</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Form on Left (60%), Real-time Live Preview on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Clean 2-column symmetry (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-7">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Thông Tin Nhân Viên
              </h2>
              <p className="text-xs text-slate-500">
                Nhập các trường bên dưới; bản xem trước bên phải sẽ cập nhật tức thì.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Code (50%) | Full Name (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mã nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ACF0005"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Phạm An Khánh"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Row 2: Position (50%) | Department (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chức vụ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Ví dụ: Kỹ sư Phần mềm / Quản đốc"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phòng ban <span className="text-rose-500">*</span>
                </label>
                <AdminSelect value={formData.department} onChange={(department) => setFormData({ ...formData, department })} options={DEPARTMENTS.map((value) => ({ value, label: value }))} className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
            </div>

            {/* Row 3: Join Date (50%) | Birth Date (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày gia nhập (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  placeholder="22/09/2026"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày sinh (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  placeholder="15/08/1996"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Row 4: Location (50%) | Status (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Văn phòng / Địa điểm làm việc
                </label>
                <AdminSelect value={formData.location} onChange={(location) => setFormData({ ...formData, location })} options={[{ value: 'Văn Phòng Á Châu Dĩ An', label: 'Văn Phòng Á Châu Dĩ An' }, { value: 'Bình Dương', label: 'Bình Dương (Nhà máy số 1)' }, { value: 'Long An', label: 'Long An (Nhà máy số 2)' }]} className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Trạng thái làm việc
                </label>
                <AdminSelect value={formData.status} onChange={(status) => setFormData({ ...formData, status: status as EmployeeStatus })} options={[{ value: 'active', label: 'Đang làm việc' }, { value: 'probation', label: 'Thử việc' }]} className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
            </div>

            {/* Row 5: Email (50%) | Phone (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email công việc
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Nhanvien@asiafnb.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0901 234 567"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Row 6: Avatar URL (50%) | Bio (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Link ảnh đại diện (Avatar URL)
                </label>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                
                {/* Quick avatar selection */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Chọn nhanh:</span>
                  <div className="flex items-center gap-1">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: url })}
                        className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                          formData.avatar === url ? 'ring-2 ring-emerald-500 border-white scale-110' : 'border-slate-300 opacity-60 hover:opacity-100'
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
                  Mô tả / Tiểu sử công việc
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Kinh nghiệm, thế mạnh, chuyên môn phụ trách..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Bottom Actions inside form */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Quay lại danh sách nhân sự
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Nhân Viên Này</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Bản Xem Trước Trực Quan (Live Preview)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Khớp 100% thẻ hiển thị</span>
          </div>

          {/* EXACT Match with User Image 1 */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 p-6 shadow-sm">
            {/* Top section: Portrait Avatar on Left, Badge & Info on Right */}
            <div className="flex items-start gap-5">
              <div className="shrink-0">
                <img
                  src={formData.avatar || PRESET_AVATARS[0]}
                  alt={formData.fullName || 'Bùi Thị H'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                  }}
                  className="w-28 h-36 rounded-2xl object-cover border border-slate-100 shadow-2xs"
                />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                {/* Green Status Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      formData.status === 'active'
                        ? 'bg-emerald-500'
                        : formData.status === 'probation'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  ></span>
                  <span>
                    {formData.status === 'active'
                      ? 'Đang làm việc'
                      : formData.status === 'probation'
                      ? 'Thử việc'
                      : 'Đã nghỉ việc'}
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-2 truncate">
                  {formData.fullName || 'Bùi Thị H'}
                </h3>

                {/* Position */}
                <p className="text-sm font-medium text-slate-500 mt-1 truncate">
                  {formData.position || 'Logistics Coordinator'}
                </p>

                {/* Department */}
                <p className="text-sm text-slate-400 mt-0.5 truncate">
                  {formData.department || 'Phòng Logistics'}
                </p>
              </div>
            </div>

            {/* Tabs: [Thông tin chung] | [Mô tả] */}
            <div className="flex items-center gap-6 border-b border-slate-100 mt-6 mb-5">
              <button
                type="button"
                onClick={() => setPreviewTab('info')}
                className={`pb-2.5 text-sm font-bold transition-all relative ${
                  previewTab === 'info'
                    ? 'text-emerald-700'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                Thông tin chung
                {previewTab === 'info' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('bio')}
                className={`pb-2.5 text-sm transition-all relative ${
                  previewTab === 'bio'
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                Mô tả
                {previewTab === 'bio' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"></span>
                )}
              </button>
            </div>

            {/* Content Tab 1: Exact List of Attributes matching User Image 1 */}
            {previewTab === 'info' && (
              <div className="space-y-3.5 text-sm">
                {/* Mã nhân viên */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <UserPlus className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Mã nhân viên
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formData.code || 'ACF0008'}
                  </span>
                </div>

                {/* Ngày gia nhập */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <Calendar className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Ngày gia nhập
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formData.joinDate || '15/07/2021'}
                  </span>
                </div>

                {/* Chức vụ */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <Briefcase className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Chức vụ
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px] text-right">
                    {formData.position || 'Logistics Coordinator'}
                  </span>
                </div>

                {/* Phòng ban */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <Building className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Phòng ban
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px] text-right">
                    {formData.department || 'Phòng Logistics'}
                  </span>
                </div>

                {/* Văn phòng */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <MapPin className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Văn phòng
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formData.location || 'Văn Phòng Á Châu Dĩ An'}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <Mail className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Email
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px] text-right">
                    {formData.email || 'buithih@wana.com'}
                  </span>
                </div>

                {/* Số điện thoại */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <Phone className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Số điện thoại
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formData.phone || '0908 901 234'}
                  </span>
                </div>

                {/* Ngày sinh */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2.5 font-normal">
                    <Cake className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    Ngày sinh
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formData.birthDate || '25/12/1994'}
                  </span>
                </div>
              </div>
            )}

            {/* Content Tab 2: Bio description */}
            {previewTab === 'bio' && (
              <div className="p-4 bg-slate-50/80 rounded-2xl text-sm text-slate-700 leading-relaxed min-h-[220px]">
                {formData.bio || (
                  <span className="text-slate-400 italic">
                    Chưa nhập mô tả tiểu sử công việc. Nhập ở biểu mẫu bên trái để hiển thị tại đây.
                  </span>
                )}
              </div>
            )}

            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Kiểm tra thông tin trước khi nhấn lưu
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Xác Nhận Lưu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
