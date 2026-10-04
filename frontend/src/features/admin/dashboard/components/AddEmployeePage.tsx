import React, { useEffect, useMemo, useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Employee, EmployeeStatus } from '../types';
import { AdminSelect } from './AdminSelect';
import RichTextEditor from "@/components/ui/RichTextEditor";
import DatePicker from "@/components/ui/DatePicker";
import EmployeeProfileCard from "@/components/ui/EmployeeProfileCard";
import AvatarUploader from "@/components/ui/AvatarUploader";
import { DEPARTMENTS } from '@/config/departments';
import { EMPLOYEE_RANK_OPTIONS, getEmployeeRankLabel } from '@/config/employeeRanks';
import { createAdminEmployee, updateAdminEmployee } from '@/services/admin-employee.service';

interface AddEmployeePageProps {
  onBack: () => void;
  onSave: (employee: Employee) => void;
  existingCount: number;
  mode?: 'create' | 'edit';
  initialEmployee?: Employee;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
];

function decodeHtmlEntities(value: string): string {
  if (typeof document === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function toPlainText(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDatePickerValue(value: string): string {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return "";
  return year + "-" + month.padStart(2, "0") + "-" + day.padStart(2, "0");
}

function fromDatePickerValue(value: string): string {
  const [year, month, day] = value.split("-");
  if (!day || !month || !year) return "";
  return day + "/" + month + "/" + year;
}

export const AddEmployeePage: React.FC<AddEmployeePageProps> = ({
  onBack,
  onSave,
  mode = 'create',
  initialEmployee,
}) => {
  const isEditing = mode === 'edit' && Boolean(initialEmployee);

  const emptyForm = {
    code: '', fullName: '', position: '', department: '', rank: '',
    status: '' as EmployeeStatus, joinDate: '', birthDate: '', location: '',
    email: '', phone: '', avatar: '', bio: ''
  };
  const [formData, setFormData] = useState(() => initialEmployee ? {
    code: initialEmployee.code,
    fullName: initialEmployee.fullName,
    position: initialEmployee.position,
    department: initialEmployee.department,
    rank: initialEmployee.rank ?? '',
    status: initialEmployee.status,
    joinDate: initialEmployee.joinDate,
    birthDate: initialEmployee.birthDate,
    location: initialEmployee.location,
    email: initialEmployee.email,
    phone: initialEmployee.phone,
    avatar: initialEmployee.avatar,
    bio: initialEmployee.bio ?? '',
  } : emptyForm);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarUploaderKey, setAvatarUploaderKey] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : formData.avatar),
    [avatarFile],
  );

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const requiredValues = [
      formData.code,
      formData.fullName,
      formData.position,
      formData.department,
      formData.rank,
      formData.joinDate,
      formData.location,
      formData.email,
      formData.phone,
    ];
    if (requiredValues.some((value) => !value.trim())) {
      setErrorMsg("Vui l\u00f2ng \u0111i\u1ec1n \u0111\u1ea7y \u0111\u1ee7 c\u00e1c tr\u01b0\u1eddng th\u00f4ng tin b\u1eaft bu\u1ed9c.");
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);

    try {
      if (isEditing && initialEmployee && !/^[a-f\d]{24}$/i.test(initialEmployee.id)) {
        onSave({ ...initialEmployee, ...formData, avatar: avatarPreview || initialEmployee.avatar });
        return;
      }
      const saveEmployee = isEditing && initialEmployee
        ? updateAdminEmployee.bind(null, initialEmployee.id)
        : createAdminEmployee;
      const employee = await saveEmployee(
        {
          employeeCode: formData.code.trim(),
          name: formData.fullName.trim(),
          position: formData.position.trim(),
          department: formData.department,
          rank: formData.rank,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          location: formData.location,
          joinDate: toDatePickerValue(formData.joinDate),
          birthDate: toDatePickerValue(formData.birthDate) || undefined,
          status: formData.status || undefined,
          description: formData.bio.trim(),
        },
        avatarFile,
      );

      onSave({
        ...formData,
        id: employee._id || initialEmployee?.id || '',
        code: employee.employeeCode,
        fullName: employee.name,
        position: employee.position,
        department: employee.department,
        rank: employee.rank ?? formData.rank,
        avatar: employee.avatar || formData.avatar,
        status: employee.status,
        email: employee.email,
        phone: employee.phone,
        location: employee.location,
        bio: employee.description ?? "",
        createdBy: employee.createdBy ?? initialEmployee?.createdBy,
        createdAt: employee.createdAt ?? initialEmployee?.createdAt,
        updatedAt: employee.updatedAt ?? initialEmployee?.updatedAt,
      });
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Kh\u00f4ng th\u1ec3 l\u01b0u nh\u00e2n vi\u00ean. Vui l\u00f2ng th\u1eed l\u1ea1i.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  const handleReset = () => {
    setFormData(initialEmployee ? {
      code: initialEmployee.code, fullName: initialEmployee.fullName, position: initialEmployee.position,
      department: initialEmployee.department, rank: initialEmployee.rank ?? '', status: initialEmployee.status,
      joinDate: initialEmployee.joinDate, birthDate: initialEmployee.birthDate, location: initialEmployee.location,
      email: initialEmployee.email, phone: initialEmployee.phone, avatar: initialEmployee.avatar, bio: initialEmployee.bio ?? '',
    } : emptyForm);
    setErrorMsg(null);
    setAvatarFile(null);
    setAvatarUploaderKey((value) => value + 1);
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
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{isEditing ? "Ch\u1ec9nh s\u1eeda nh\u00e2n vi\u00ean" : "Th\u00eam nh\u00e2n s\u1ef1 m\u1edbi"}</span>
              <span className="text-slate-400 text-xs">Asia F&B Beverage</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">{isEditing ? "H\u1ed3 s\u01a1 nh\u00e2n s\u1ef1 & Ch\u1ec9nh s\u1eeda" : "H\u1ed3 s\u01a1 nh\u00e2n s\u1ef1 & Xem tr\u01b0\u1edbc tr\u1ef1c quan"}</h1>
            {isEditing && (
              <p className="mt-1 text-xs text-slate-500">
                {initialEmployee?.createdAt ? (
                  <>
                    {"Do "}<strong>{initialEmployee.createdBy?.name ?? "T\u00e0i kho\u1ea3n qu\u1ea3n tr\u1ecb"}</strong>
                    {" t\u1ea1o ng\u00e0y "}{new Date(initialEmployee.createdAt).toLocaleDateString("vi-VN")}
                    {" l\u00fac "}{new Date(initialEmployee.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </>
                ) : "H\u1ed3 s\u01a1 c\u0169 ch\u01b0a c\u00f3 th\u00f4ng tin ng\u01b0\u1eddi t\u1ea1o v\u00e0 th\u1eddi \u0111i\u1ec3m t\u1ea1o."}
              </p>
            )}          </div>
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? "L\u01b0u thay \u0111\u1ed5i" : "L\u01b0u nh\u00e2n vi\u00ean"}</span>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Code (50%) | Full Name (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Mã nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Row 2: Position (50%) | Department (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Chức vụ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Phòng ban <span className="text-rose-500">*</span>
                </label>
                <AdminSelect value={formData.department} onChange={(department) => setFormData({ ...formData, department })} options={DEPARTMENTS.map((value) => ({ value, label: value }))} placeholder="" className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Cấp bậc <span className="text-rose-500">*</span>
              </label>
              <AdminSelect
                value={formData.rank}
                onChange={(rank) => setFormData({ ...formData, rank })}
                options={EMPLOYEE_RANK_OPTIONS}
                placeholder="Chọn cấp bậc"
                className="w-full"
                searchable={false}
                showSelectionCheck={false}
              />
            </div>
            {/* Row 3: Join Date (50%) | Birth Date (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Ngày gia nhập (DD/MM/YYYY)
                </label>
                <DatePicker
                  value={toDatePickerValue(formData.joinDate)}
                  onChange={(value) => setFormData({ ...formData, joinDate: fromDatePickerValue(value) })}
                  ariaLabel="Ng?y gia nh?p"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Ngày sinh (DD/MM/YYYY)
                </label>
                <DatePicker
                  value={toDatePickerValue(formData.birthDate)}
                  onChange={(value) => setFormData({ ...formData, birthDate: fromDatePickerValue(value) })}
                  ariaLabel="Ng?y sinh"
                />
              </div>
            </div>

            {/* Row 4: Location (50%) | Status (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Văn phòng / Địa điểm làm việc
                </label>
                <AdminSelect value={formData.location} onChange={(location) => setFormData({ ...formData, location })} options={[{ value: 'Văn Phòng Á Châu Dĩ An', label: 'Văn Phòng Á Châu Dĩ An' }, { value: 'Bình Dương', label: 'Bình Dương (Nhà máy số 1)' }, { value: 'Long An', label: 'Long An (Nhà máy số 2)' }]} placeholder="" className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Trạng thái làm việc
                </label>
                <AdminSelect value={formData.status} onChange={(status) => setFormData({ ...formData, status: status as EmployeeStatus })} options={[
                  { value: 'active', label: '\u0110ang l\u00e0m vi\u1ec7c' },
                  { value: 'probation', label: 'Th\u1eed vi\u1ec7c' },
                  { value: 'inactive', label: '\u0110\u00e3 ngh\u1ec9 vi\u1ec7c' },
                ]} placeholder="" className="w-full" searchable={false} showSelectionCheck={false} />
              </div>
            </div>

            {/* Row 5: Email (50%) | Phone (50%) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Email công việc
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Row 6: Avatar upload */}
            <AvatarUploader
              key={avatarUploaderKey}
              onFileChange={setAvatarFile}
            />

            {/* Row 7: Bio */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Mô tả / Tiểu sử công việc
                </label>
                <RichTextEditor
                  value={formData.bio}
                  onChange={(bio) => setFormData({ ...formData, bio })}
                />
              </div>

            {/* Bottom Actions inside form */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Quay lại danh sách nhân sự
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? "L\u01b0u thay \u0111\u1ed5i" : "L\u01b0u nh\u00e2n vi\u00ean n\u00e0y"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {"B\u1ea3n xem tr\u01b0\u1edbc tr\u1ef1c quan (Live Preview)"}
            </span>
          </div>

          <EmployeeProfileCard
            avatar={avatarPreview}
            fallbackAvatar={PRESET_AVATARS[0]}
            name={formData.fullName || "B\u00f9i Th\u1ecb H"}
            position={formData.position || "Logistics Coordinator"}
            status={formData.status || "inactive"}
            details={[
              { icon: UserPlus, label: "M\u00e3 nh\u00e2n vi\u00ean", value: formData.code || "ACF0008" },
              { icon: Calendar, label: "Ng\u00e0y gia nh\u1eadp", value: formData.joinDate || "15/07/2021" },
              { icon: Briefcase, label: "Ch\u1ee9c v\u1ee5", value: formData.position || "Logistics Coordinator" },
              { icon: Briefcase, label: "Cấp bậc", value: getEmployeeRankLabel(formData.rank) },
              { icon: Building, label: "Ph\u00f2ng ban", value: formData.department || "Ph\u00f2ng Logistics" },
              { icon: MapPin, label: "V\u0103n ph\u00f2ng", value: formData.location || "V\u0103n Ph\u00f2ng \u00c1 Ch\u00e2u D\u0129 An" },
              { icon: Mail, label: "Email", value: formData.email || "buithih@wana.com" },
              { icon: Phone, label: "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i", value: formData.phone || "0908 901 234" },
              { icon: Cake, label: "Ng\u00e0y sinh", value: formData.birthDate || "25/12/1994" },
            ]}
            description={formData.bio ? toPlainText(formData.bio) : ""}
            imageSizes="360px"
            className="w-full max-w-[360px]"
          />
        </div>
      </div>
    </div>
  );
};
