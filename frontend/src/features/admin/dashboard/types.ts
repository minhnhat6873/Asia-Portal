export type EmployeeStatus = 'active' | 'probation' | 'inactive';
export type EmployeeGender = 'male' | 'female' | 'other';

export interface Employee {
  id: string;
  code: string; // e.g. ACF0001
  fullName: string;
  email: string;
  phone: string;
  department: string;
  rank?: string;
  position: string; // e.g. IT, QuÃ¡ÂºÂ£n Ã„â€˜Ã¡Â»â€˜c, TrÃ†Â°Ã¡Â»Å¸ng phÃƒÂ²ng
  status: EmployeeStatus; // 'active' -> Ã„Âang lÃƒÂ m viÃ¡Â»â€¡c, 'probation' -> ThÃ¡Â»Â­ viÃ¡Â»â€¡c, 'inactive' -> Ã„ÂÃƒÂ£ nghÃ¡Â»â€°
  joinDate: string; // e.g. 01/06/2022
  birthDate: string; // e.g. 15/03/1995
  gender?: EmployeeGender;
  location: string; // e.g. HÃ¡Â»â€œ ChÃƒÂ­ Minh, BÃƒÂ¬nh DÃ†Â°Ã†Â¡ng, Long An
  avatar: string;
  chartAvatar?: string;
  bio?: string;
  createdBy?: { accountId: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string; // Tab MÃƒÂ´ tÃ¡ÂºÂ£
}

export type MediaCategory = 'Sự kiện' | 'Tin tức' | 'Nhân sự' | 'Thông báo';

export interface MediaPost {
  id: string;
  title: string;
  category: MediaCategory;
  summary: string; // Sapo tÃƒÂ³m tÃ¡ÂºÂ¯t ngÃ¡ÂºÂ¯n
  content: string; // Chi tiÃ¡ÂºÂ¿t bÃƒÂ i viÃ¡ÂºÂ¿t (hiÃ¡Â»Æ’n thÃ¡Â»â€¹ trong khung thÃƒÂ´ng tin xanh)
  coverImage: string;
  authorDepartment: string; // e.g. PhÃƒÂ²ng Marketing, Ban TruyÃ¡Â»Ân thÃƒÂ´ng
  publishDate: string; // e.g. 05/09/2026
  status: 'published' | 'draft';
  createdBy?: { accountId: string; name: string; email: string };
  createdAt?: string;
}

export type TrashEntityType = 'employee' | 'media' | 'account' | 'access_user' | 'role';

/** BÃ¡ÂºÂ£n ghi xÃƒÂ³a mÃ¡Â»Âm. payload giÃ¡Â»Â¯ nguyÃƒÂªn dÃ¡Â»Â¯ liÃ¡Â»â€¡u Ã„â€˜Ã¡Â»Æ’ cÃƒÂ³ thÃ¡Â»Æ’ khÃƒÂ´i phÃ¡Â»Â¥c chÃƒÂ­nh xÃƒÂ¡c. */
export interface TrashItem {
  id: string;
  entityType: TrashEntityType;
  title: string;
  deletedAt: string;
  /** TÃƒÂ i khoÃ¡ÂºÂ£n thÃ¡Â»Â±c hiÃ¡Â»â€¡n xÃƒÂ³a. CÃƒÂ¡c bÃ¡ÂºÂ£n ghi cÃ…Â© cÃƒÂ³ thÃ¡Â»Æ’ chÃ†Â°a cÃƒÂ³ dÃ¡Â»Â¯ liÃ¡Â»â€¡u nÃƒÂ y. */
  deletedBy?: string;
  payload: unknown;
}

export type ActiveTab = 'overview' | 'employees' | 'media' | 'add-employee' | 'edit-employee' | 'add-media' | 'edit-media' | 'permissions' | 'system-settings' | 'account';

/* -------------------------------------------------------------------------- *
 * Account roles & permissions Ã¢â‚¬â€ the "PhÃƒÂ¢n quyÃ¡Â»Ân quÃ¡ÂºÂ£n lÃƒÂ½" tab
 * -------------------------------------------------------------------------- */

export type UserRole = 'admin' | 'hr_manager' | 'media_manager' | 'staff' | 'viewer';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'locked';

export interface UserPermissions {
  canViewDashboard: boolean;
  canManageEmployees: boolean; // Xem, ThÃƒÂªm, SÃ¡Â»Â­a, XÃƒÂ³a nhÃƒÂ¢n viÃƒÂªn
  canManageMedia: boolean; // Xem, ThÃƒÂªm, SÃ¡Â»Â­a, XÃƒÂ³a truyÃ¡Â»Ân thÃƒÂ´ng
  canManagePermissions: boolean; // PhÃƒÂª duyÃ¡Â»â€¡t tÃƒÂ i khoÃ¡ÂºÂ£n & phÃƒÂ¢n quyÃ¡Â»Ân (Admin)
  canExportData: boolean; // XuÃ¡ÂºÂ¥t bÃƒÂ¡o cÃƒÂ¡o, file CSV
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
