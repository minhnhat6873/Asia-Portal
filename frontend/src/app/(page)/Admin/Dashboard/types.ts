export type EmployeeStatus = 'active' | 'probation' | 'inactive';

export interface Employee {
  id: string;
  code: string; // e.g. ACF0001
  fullName: string;
  email: string;
  phone: string;
  department: string; // e.g. Phòng IT, Phòng Marketing, Phòng R&D, etc.
  position: string; // e.g. IT, Quản đốc, Trưởng phòng
  status: EmployeeStatus; // 'active' -> Đang làm việc, 'probation' -> Thử việc, 'inactive' -> Đã nghỉ
  joinDate: string; // e.g. 01/06/2022
  birthDate: string; // e.g. 15/03/1995
  location: string; // e.g. Hồ Chí Minh, Bình Dương, Long An
  avatar: string;
  bio?: string; // Tab Mô tả
}

export type MediaCategory = 'Tin tức' | 'Sự kiện' | 'Thông cáo báo chí' | 'Sản phẩm mới' | 'Nhân sự';

export interface MediaPost {
  id: string;
  title: string;
  category: MediaCategory;
  summary: string; // Sapo tóm tắt ngắn
  content: string; // Chi tiết bài viết (hiển thị trong khung thông tin xanh)
  coverImage: string;
  authorDepartment: string; // e.g. Phòng Marketing, Ban Truyền thông
  publishDate: string; // e.g. 05/09/2026
  status: 'published' | 'draft';
}

export type TrashEntityType = 'employee' | 'media' | 'account' | 'access_user' | 'role';

/** Bản ghi xóa mềm. payload giữ nguyên dữ liệu để có thể khôi phục chính xác. */
export interface TrashItem {
  id: string;
  entityType: TrashEntityType;
  title: string;
  deletedAt: string;
  payload: unknown;
}

export type ActiveTab = 'overview' | 'employees' | 'media' | 'add-employee' | 'add-media' | 'permissions' | 'system-settings';

/* -------------------------------------------------------------------------- *
 * Account roles & permissions — the "Phân quyền quản lý" tab
 * -------------------------------------------------------------------------- */

export type UserRole = 'admin' | 'hr_manager' | 'media_manager' | 'staff' | 'viewer';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'locked';

export interface UserPermissions {
  canViewDashboard: boolean;
  canManageEmployees: boolean; // Xem, Thêm, Sửa, Xóa nhân viên
  canManageMedia: boolean; // Xem, Thêm, Sửa, Xóa truyền thông
  canManagePermissions: boolean; // Phê duyệt tài khoản & phân quyền (Admin)
  canExportData: boolean; // Xuất báo cáo, file CSV
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  status: UserStatus;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: string;
  registrationReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectReason?: string;
}
