import React, { useState, useMemo } from 'react';
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
  LayoutGrid,
  List,
  X
} from 'lucide-react';
import { Employee, EmployeeStatus } from '../types';
import { AdminSelect } from './AdminSelect';
import { DEPARTMENTS } from '@/config/departments';

interface EmployeeManagementProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  selectedEmployeeForDossier: Employee | null;
  onCloseDossier: () => void;
  onOpenDossier: (emp: Employee) => void;
  onNavigateToAdd?: () => void;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  selectedEmployeeForDossier,
  onCloseDossier,
  onOpenDossier,
  onNavigateToAdd,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Track active sub-tab for individual cards: 'info' | 'bio'
  const [cardTabs, setCardTabs] = useState<Record<string, 'info' | 'bio'>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State: 100% straight and balanced (no chicken avatar)
  const [formData, setFormData] = useState({
    code: '',
    fullName: '',
    position: '',
    department: 'Phòng IT',
    status: 'active' as EmployeeStatus,
    joinDate: '01/06/2022',
    birthDate: '15/03/1995',
    location: 'Hồ Chí Minh',
    email: '',
    phone: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    bio: ''
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.includes(searchQuery) ||
        emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = selectedDept === 'all' || emp.department === selectedDept;
      const matchStatus = selectedStatus === 'all' || emp.status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  // Reset filter function requested by user
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('all');
    setSelectedStatus('all');
  };

  // Open Add modal with aligned defaults
  const handleOpenAdd = () => {
    const nextNum = employees.length + 1;
    const nextCode = `ACF000${nextNum}`;
    setFormData({
      code: nextCode,
      fullName: '',
      position: 'IT',
      department: 'Phòng IT',
      status: 'active',
      joinDate: '01/06/2022',
      birthDate: '15/03/1995',
      location: 'Hồ Chí Minh',
      email: '',
      phone: '0901 234 567',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      bio: 'Chuyên viên quản trị hệ thống và vận hành phần mềm tại Asia Food & Beverage.'
    });
    setIsAddModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      code: emp.code,
      fullName: emp.fullName,
      position: emp.position,
      department: emp.department,
      status: emp.status,
      joinDate: emp.joinDate,
      birthDate: emp.birthDate,
      location: emp.location,
      email: emp.email,
      phone: emp.phone,
      avatar: emp.avatar && !emp.avatar.includes('chicken') ? emp.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      bio: emp.bio || ''
    });
  };

  // Submit Add
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) return;

    onAddEmployee({
      code: formData.code.trim() || `ACF${Math.floor(Math.random() * 9000 + 1000)}`,
      fullName: formData.fullName.trim(),
      position: formData.position.trim() || 'IT',
      department: formData.department,
      status: formData.status,
      joinDate: formData.joinDate.trim() || '01/06/2022',
      birthDate: formData.birthDate.trim() || '15/03/1995',
      location: formData.location.trim() || 'Hồ Chí Minh',
      email: formData.email.trim(),
      phone: formData.phone.trim() || '0901 234 567',
      avatar: formData.avatar.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      bio: formData.bio.trim()
    });

    setIsAddModalOpen(false);
  };

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !formData.fullName.trim()) return;

    onUpdateEmployee({
      ...editingEmployee,
      code: formData.code.trim(),
      fullName: formData.fullName.trim(),
      position: formData.position.trim(),
      department: formData.department,
      status: formData.status,
      joinDate: formData.joinDate.trim(),
      birthDate: formData.birthDate.trim(),
      location: formData.location.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      avatar: formData.avatar.trim() || editingEmployee.avatar,
      bio: formData.bio.trim()
    });

    setEditingEmployee(null);
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
      {/* Page Title & Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, phòng ban, chức vụ, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <AdminSelect value={selectedDept} onChange={setSelectedDept} className="min-w-52" searchPlaceholder="Tìm kiếm phòng ban..." options={[{ value: 'all', label: 'Tất cả phòng ban' }, ...DEPARTMENTS.map((dept) => ({ value: dept, label: dept }))]} />

          <AdminSelect value={selectedStatus} onChange={(value) => setSelectedStatus(value as 'all' | EmployeeStatus)} className="min-w-44" searchPlaceholder="Tìm kiếm trạng thái..." options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang làm việc' }, { value: 'probation', label: 'Thử việc' }]} />

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

          {/* Add Employee Button */}
          <button
            onClick={onNavigateToAdd || handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhân Viên</span>
          </button>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Đang hiển thị <strong>{filteredEmployees.length}</strong> nhân sự trong hệ thống Asia F&B Beverage
        </span>
        {(searchQuery || selectedDept !== 'all' || selectedStatus !== 'all') && (
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
                          {emp.department}
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
                          <span className="font-bold text-slate-900">{emp.department}</span>
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
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {emp.bio || 'Chưa có thông tin mô tả chi tiết cho nhân sự này.'}
                        </p>
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
                        onClick={() => handleOpenEdit(emp)}
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
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[860px] table-fixed text-xs text-slate-600">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[17%]" />
                <col className="w-[19%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Mã nhân viên</th>
                  <th className="px-4 py-4 text-center">Họ và tên</th>
                  <th className="px-4 py-4 text-center">Phòng ban</th>
                  <th className="px-4 py-4 text-center">Chức vụ</th>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Ngày gia nhập</th>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Trạng thái</th>
                  <th className="whitespace-nowrap px-4 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-400">
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
                      <td className="break-words px-4 py-4 text-center text-slate-600">{emp.department}</td>
                      <td className="break-words px-4 py-4 text-center font-medium text-slate-800">{emp.position}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-center font-medium text-slate-700">{emp.joinDate}</td>
                      <td className="px-4 py-4 text-center">{renderStatusPill(emp.status)}</td>
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
                            onClick={() => handleOpenEdit(emp)}
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

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {/* Redesigned: 100% straight, balanced 50%-50% equal columns, ONE single frame, NO internal scrollbar */}
      {(isAddModalOpen || editingEmployee) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isAddModalOpen ? 'Thêm Nhân Viên Mới' : 'Chỉnh Sửa Thông Tin Nhân Viên'}
                </h3>
                <p className="text-xs text-slate-500">
                  Asia F&B Beverage • Nhập thông tin hồ sơ nhân sự
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleSubmitAdd : handleSubmitEdit}
              className="space-y-3.5 text-xs"
            >
              {/* Row 1: Mã nhân viên (50%) & Họ và tên (50%) -> Exactly equal and straight */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã nhân viên *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                    placeholder="ACF0001"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                    placeholder="Phạm An Khánh"
                  />
                </div>
              </div>

              {/* Row 2: Chức vụ (50%) & Phòng ban (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chức vụ *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    placeholder="IT"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phòng ban *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Ngày gia nhập (50%) & Ngày sinh (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày gia nhập (DD/MM/YYYY) *</label>
                  <input
                    type="text"
                    required
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="01/06/2022"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày sinh (DD/MM/YYYY) *</label>
                  <input
                    type="text"
                    required
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="15/03/1995"
                  />
                </div>
              </div>

              {/* Row 4: Văn phòng (50%) & Trạng thái làm việc (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Văn phòng *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Hồ Chí Minh"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trạng thái làm việc *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  >
                    <option value="active">Đang làm việc</option>
                    <option value="probation">Thử việc</option>
                    <option value="inactive">Đã nghỉ</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Email (50%) & Số điện thoại (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="nguyenvana@wana.com"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="0901 234 567"
                  />
                </div>
              </div>

              {/* Row 6: Link ảnh đại diện (50%) & Mô tả / Ghi chú (50%) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Link ảnh đại diện (Avatar URL)</label>
                  <input
                    type="url"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mô tả / Tiểu sử công việc</label>
                  <input
                    type="text"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Chuyên viên kỹ thuật quản trị hệ thống..."
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  {isAddModalOpen ? 'Lưu Nhân Viên' : 'Cập Nhật Hồ Sơ'}
                </button>
              </div>
            </form>
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
            <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Nhân Viên?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Hành động này sẽ xóa dữ liệu nhân sự khỏi hệ thống quản lý. Bạn có chắc chắn muốn xóa?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onDeleteEmployee(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Đồng Ý 
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
                  {selectedEmployeeForDossier.department}
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
                <span className="font-bold text-slate-900">{selectedEmployeeForDossier.department}</span>
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

            {selectedEmployeeForDossier.bio && (
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                <span className="font-semibold block text-slate-500 mb-1">Mô tả:</span>
                {selectedEmployeeForDossier.bio}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onCloseDossier();
                  handleOpenEdit(selectedEmployeeForDossier);
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
