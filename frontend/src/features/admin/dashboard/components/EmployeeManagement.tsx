import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRichTextContent, RichText } from '@/components/ui/RichText';
import { 
  Plus, 
  Search, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Briefcase,
  Building,
  User,
  Cake,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  LoaderCircle,
  X
} from 'lucide-react';
import { Employee, EmployeeStatus } from '../types';
import { AdminSelect } from './AdminSelect';
import { EMPLOYEE_DEPARTMENT_OPTIONS, getEmployeeDepartmentLabel } from '@/components/ui/employee-department-options';
import { EMPLOYEE_RANK_OPTIONS_UI, getEmployeeRankLabel } from '@/components/ui/employee-rank-options';
import { EMPLOYEE_STATUS_OPTIONS_UI } from '@/components/ui/employee-status-options';
import type { AdminEmployeeListParams } from '@/services/admin-employee.service';

const EMPLOYEE_FILTER_STORAGE_KEY = 'asia.admin.employee-filters';

interface StoredEmployeeFilters {
  searchQuery: string;
  selectedDept: string;
  selectedRank: string;
  selectedStatus: string;
  viewMode: 'grid' | 'table';
}

function formatCreatedAt(value?: string): string {
  if (!value) return "\u0043\u0068\u01b0\u0061 \u0063\u00f3 \u0064\u1eef \u006c\u0069\u1ec7\u0075";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u0043\u0068\u01b0\u0061 \u0063\u00f3 \u0064\u1eef \u006c\u0069\u1ec7\u0075";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
interface EmployeeManagementProps {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
  loadError?: string | null;
  isLoading?: boolean;
  onDeleteEmployee: (id: string) => boolean | Promise<boolean>;
  onFiltersChange: (filters: AdminEmployeeListParams) => void;
  onPageChange: (page: number) => void;
  selectedEmployeeForDossier: Employee | null;
  onCloseDossier: () => void;
  onOpenDossier: (emp: Employee) => void;
  onNavigateToAdd: () => void;
  onNavigateToEdit?: (employee: Employee) => void;
  onNavigateToTrash?: () => void;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  employees,
  total,
  page,
  pageSize,
  loadError,
  isLoading = false,
  onDeleteEmployee,
  onFiltersChange,
  onPageChange,
  selectedEmployeeForDossier,
  onCloseDossier,
  onOpenDossier,
  onNavigateToAdd,
  onNavigateToEdit,
  onNavigateToTrash,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRank, setSelectedRank] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [areFiltersRestored, setAreFiltersRestored] = useState(false);

  // Track active sub-tab for individual cards: 'info' | 'bio'
  const [cardTabs, setCardTabs] = useState<Record<string, 'info' | 'bio'>>({});

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(sessionStorage.getItem(EMPLOYEE_FILTER_STORAGE_KEY) ?? 'null') as Partial<StoredEmployeeFilters> | null;
        if (stored) {
          setSearchQuery(typeof stored.searchQuery === 'string' ? stored.searchQuery : '');
          setSelectedDept(typeof stored.selectedDept === 'string' ? stored.selectedDept : 'all');
          setSelectedRank(typeof stored.selectedRank === 'string' ? stored.selectedRank : 'all');
          setSelectedStatus(typeof stored.selectedStatus === 'string' ? stored.selectedStatus : 'all');
          setViewMode(stored.viewMode === 'grid' ? 'grid' : 'table');
        }
      } catch {
        sessionStorage.removeItem(EMPLOYEE_FILTER_STORAGE_KEY);
      } finally {
        setAreFiltersRestored(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!areFiltersRestored) return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(EMPLOYEE_FILTER_STORAGE_KEY, JSON.stringify({
        searchQuery,
        selectedDept,
        selectedRank,
        selectedStatus,
        viewMode,
      } satisfies StoredEmployeeFilters));
      onFiltersChange({
        search: searchQuery.trim() || undefined,
        department: selectedDept === 'all' ? undefined : selectedDept,
        rank: selectedRank === 'all' ? undefined : selectedRank,
        status: selectedStatus === 'all' ? undefined : selectedStatus as EmployeeStatus,
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [areFiltersRestored, onFiltersChange, searchQuery, selectedDept, selectedRank, selectedStatus, viewMode]);

  const filteredEmployees = employees;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const deletingEmployee = deletingId ? employees.find((employee) => employee.id === deletingId) : null;

  // Reset filter function requested by user
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('all');
    setSelectedRank('all');
    setSelectedStatus('all');
    sessionStorage.removeItem(EMPLOYEE_FILTER_STORAGE_KEY);
  };


  // Helper status label
  const renderStatusPill = (status: EmployeeStatus) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Đang làm việc
        </span>
      );
    }
    if (status === 'probation') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Thử việc
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        Đã nghỉ
      </span>
    );
  };

  // Helper avatar render (Clean professional avatar, no chicken)
  const renderAvatar = (emp: Employee, sizeClass = 'w-24 h-24') => {
    if (emp.avatar && !emp.avatar.includes('chicken')) {
      return (
        <img
          src={emp.avatar}
          alt={emp.fullName}
          className={`${sizeClass} rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center text-xl shrink-0 shadow-2xs`}>
        {emp.fullName.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isLoading && employees.length === 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
            <p className="mt-4 text-base font-bold text-slate-900">Đang tải dữ liệu nhân viên</p>
            <p className="mt-1 text-sm text-slate-500">Vui lòng chờ trong giây lát</p>
          </div>
        </div>,
        document.body,
      )}
      {/* Page Title & Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <AdminSelect value={selectedDept} onChange={setSelectedDept} className="min-w-52" searchPlaceholder="Tìm kiếm phòng ban..." options={[{ value: 'all', label: 'Tất cả phòng ban' }, ...EMPLOYEE_DEPARTMENT_OPTIONS]} />

          <AdminSelect value={selectedRank} onChange={setSelectedRank} className="min-w-44" searchPlaceholder="Tìm kiếm cấp bậc..." options={[{ value: 'all', label: 'Tất cả cấp bậc' }, ...EMPLOYEE_RANK_OPTIONS_UI]} />

          <AdminSelect value={selectedStatus} onChange={(value) => setSelectedStatus(value as 'all' | EmployeeStatus)} className="min-w-44" searchPlaceholder="Tìm kiếm trạng thái..." options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...EMPLOYEE_STATUS_OPTIONS_UI]} />

          {/* Toggle View Mode (Image 5) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Xem dạng thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Xem dạng bảng"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Reset filter button (replaced CSV export as requested) */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            title="Đặt lại tất cả bộ lọc tìm kiếm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Đặt lại</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToTrash}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Thùng rác"
            aria-label="Mở Thùng rác"
            disabled={!onNavigateToTrash}
          >
            <Trash2 className="h-4 w-4" />
          </button>


          {/* Add Employee Button */}
          <button
            onClick={onNavigateToAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhân Viên</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          Đang tải danh sách nhân viên...
        </div>
      )}

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Đang hiển thị <strong>{total}</strong> nhân sự trong hệ thống Asia F&B Beverage
        </span>
        {(searchQuery || selectedDept !== 'all' || selectedRank !== 'all' || selectedStatus !== 'all') && (
          <button
            onClick={handleResetFilters}
            className="text-emerald-600 hover:underline font-semibold"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* VIEW: GRID */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              Không tìm thấy nhân viên nào phù hợp.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const activeSubTab = cardTabs[emp.id] || 'info';
              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar & Profile Header */}
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="shrink-0">
                        {renderAvatar(emp, 'w-24 h-24')}
                      </div>

                      {/* Header details */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="mb-2">
                          {renderStatusPill(emp.status)}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                          {emp.fullName}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium mt-0.5">
                          {emp.position}
                        </p>
                        <p className="text-sm text-slate-400 font-normal">
                          {getEmployeeDepartmentLabel(emp.department)}
                        </p>
                      </div>
                    </div>

                    {/* Navigation Tabs: Thông tin chung & Mô tả */}
                    <div className="mt-5 border-b border-slate-100 flex items-center gap-6 text-sm">
                      <button
                        onClick={() => setCardTabs((prev) => ({ ...prev, [emp.id]: 'info' }))}
                        className={`pb-2.5 font-bold transition-all relative ${
                          activeSubTab === 'info'
                            ? 'text-emerald-700'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Thông tin chung
                        {activeSubTab === 'info' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-600 rounded-full" />
                        )}
                      </button>

                      <button
                        onClick={() => setCardTabs((prev) => ({ ...prev, [emp.id]: 'bio' }))}
                        className={`pb-2.5 font-bold transition-all relative ${
                          activeSubTab === 'bio'
                            ? 'text-emerald-700'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Mô tả
                        {activeSubTab === 'bio' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-600 rounded-full" />
                        )}
                      </button>
                    </div>

                    {/* Tab 1: Thông tin chung */}
                    {activeSubTab === 'info' && (
                      <div className="mt-4 space-y-3.5 text-sm">
                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <User className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Mã nhân viên</span>
                          <span className="font-bold text-slate-900">{emp.code}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <Calendar className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Ngày gia nhập</span>
                          <span className="font-bold text-slate-900">{emp.joinDate}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <Briefcase className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Chức vụ</span>
                          <span className="font-bold text-slate-900">{emp.position}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <Building className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Phòng ban</span>
                          <span className="font-bold text-slate-900">{getEmployeeDepartmentLabel(emp.department)}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <MapPin className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Văn phòng</span>
                          <span className="font-bold text-slate-900">{emp.location}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <Mail className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Email</span>
                          <span className="font-bold text-slate-900 truncate">{emp.email}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <Phone className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Số điện thoại</span>
                          <span className="font-bold text-slate-900">{emp.phone}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="w-8 flex items-center justify-start text-slate-400">
                            <Cake className="w-4 h-4" />
                          </span>
                          <span className="w-36 text-slate-500 font-normal">Ngày sinh</span>
                          <span className="font-bold text-slate-900">{emp.birthDate}</span>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Mô tả */}
                    {activeSubTab === 'bio' && (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 min-h-[220px]">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Tiểu sử & Ghi chú công việc
                        </p>
                        {hasRichTextContent(emp.bio) ? (
                          <RichText
                            html={emp.bio ?? ''}
                            className="text-sm leading-relaxed text-slate-700 [&_a]:text-emerald-700 [&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                          />
                        ) : (
                          <p className="text-sm leading-relaxed text-slate-500">Chưa có thông tin mô tả chi tiết cho nhân sự này.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => onOpenDossier(emp)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Xem hồ sơ
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigateToEdit?.(emp)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium transition-colors flex items-center gap-1"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Sửa
                      </button>
                      <button
                        onClick={() => setDeletingId(emp.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-medium transition-colors flex items-center gap-1"
                        title="Xóa nhân sự"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VIEW: TABLE */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="employee-table-scroll overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[1400px] table-fixed text-xs text-slate-600">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[17%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Mã nhân viên</th>
                  <th className="px-4 py-4 text-center">Họ và tên</th>
                  <th className="px-4 py-4 text-center">Phòng ban</th>
                  <th className="px-4 py-4 text-center">Chức vụ</th>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Cấp bậc</th>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Ngày gia nhập</th>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Trạng thái</th>
                                    <th className="px-4 py-4 text-left">{"NG\u01af\u1edcI T\u1ea0O"}</th>
<th className="whitespace-nowrap px-4 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-400">
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="transition-colors hover:bg-emerald-50/35">
                      <td className="whitespace-nowrap px-4 py-4 text-center font-mono text-xs font-bold text-emerald-700">
                        {emp.code}
                      </td>
                      <td className="break-words px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenDossier(emp)}
                          className="font-semibold text-slate-900 transition-colors hover:text-emerald-700"
                        >
                          {emp.fullName}
                        </button>
                      </td>
                      <td className="break-words px-4 py-4 text-center text-slate-600">{getEmployeeDepartmentLabel(emp.department)}</td>
                      <td className="break-words px-4 py-4 text-center font-medium text-slate-800">{emp.position}</td>
                      <td className="break-words px-4 py-4 text-center font-medium text-slate-700">{getEmployeeRankLabel(emp.rank)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-center font-medium text-slate-700">{emp.joinDate}</td>
                      <td className="px-4 py-4 text-center">{renderStatusPill(emp.status)}</td>
                      <td className="px-4 py-4 text-left">
                        <div className="space-y-1 text-left text-xs leading-5">
                          <p className="break-words font-semibold text-slate-800">
                            {emp.createdBy?.name ?? "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u"}
                          </p>
                          <p className="break-all text-slate-500">{emp.createdBy?.email ?? "—"}</p>
                          <p className="text-[11px] text-slate-400">{formatCreatedAt(emp.createdAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenDossier(emp)}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            title="Xem hồ sơ"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToEdit?.(emp)}
                            className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(emp.id)}
                            className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Trang <strong className="text-slate-800">{page}</strong> / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Trang trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa nhân viên?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Nhân viên <span className="font-semibold text-slate-700">{deletingEmployee?.fullName ?? 'đã chọn'}</span> sẽ được chuyển vào thùng rác và có thể khôi phục sau. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={isDeleteSubmitting}
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={async () => {
                  if (isDeleteSubmitting) return;
                  setIsDeleteSubmitting(true);
                  try {
                    const deleted = await onDeleteEmployee(deletingId);
                    if (deleted) setDeletingId(null);
                  } finally {
                    setIsDeleteSubmitting(false);
                  }
                }}
                disabled={isDeleteSubmitting}
                className="inline-flex min-w-28 items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleteSubmitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                {isDeleteSubmitting ? "Đang xóa..." : "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DOSSIER POPUP MODAL */}
      {selectedEmployeeForDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={onCloseDossier}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Row: Avatar & Profile Header */}
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {renderAvatar(selectedEmployeeForDossier, 'w-24 h-24')}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="mb-2">
                  {renderStatusPill(selectedEmployeeForDossier.status)}
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                  {selectedEmployeeForDossier.fullName}
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  {selectedEmployeeForDossier.position}
                </p>
                <p className="text-sm text-slate-400 font-normal">
                  {getEmployeeDepartmentLabel(selectedEmployeeForDossier.department)}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-5 border-b border-slate-100 flex items-center gap-6 text-sm">
              <span className="pb-2.5 font-bold text-emerald-700 relative">
                Thông tin chung
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-600 rounded-full" />
              </span>
            </div>

            {/* Fields list */}
            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><User className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Mã nhân viên</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.code}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><Calendar className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Ngày gia nhập</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.joinDate}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><Briefcase className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Chức vụ</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.position}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><Building className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Phòng ban</span>
                <span className="font-bold text-slate-900">{getEmployeeDepartmentLabel(selectedEmployeeForDossier.department)}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><MapPin className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Văn phòng</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.location}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><Mail className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Email</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.email}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><Phone className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Số điện thoại</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.phone}</span>
              </div>

              <div className="flex items-center">
                <span className="w-8 flex items-center justify-start text-slate-400"><Cake className="w-4 h-4" /></span>
                <span className="w-36 text-slate-500 font-normal">Ngày sinh</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.birthDate}</span>
              </div>
            </div>

            {hasRichTextContent(selectedEmployeeForDossier.bio) && (
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                <span className="font-semibold block text-slate-500 mb-1">Mô tả:</span>
                <RichText
                  html={selectedEmployeeForDossier.bio ?? ""}
                  className="leading-5 [&_a]:text-emerald-700 [&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                />
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onCloseDossier();
                  onNavigateToEdit?.(selectedEmployeeForDossier);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
