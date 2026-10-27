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
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: { accountId: string; name: string; email: string };
  id: string;
  title: string;
  category: MediaCategory;
  summary: string; // Sapo tÃƒÂ³m tÃ¡ÂºÂ¯t ngÃ¡ÂºÂ¯n
  content: string; // Chi tiÃ¡ÂºÂ¿t bÃƒÂ i viÃ¡ÂºÂ¿t (hiÃ¡Â»Æ’n thÃ¡Â»â€¹ trong khung thÃƒÂ´ng tin xanh)
  coverImage: string;
  authorDepartment: string; // e.g. PhÃƒÂ²ng Marketing, Ban TruyÃ¡Â»Ân thÃƒÂ´ng
  publishDate: string; // e.g. 05/09/2026
  expiryDate?: string | null;
  publishIndefinitely?: boolean;
  isExpired?: boolean;
  status: 'published' | 'draft';
  createdBy?: { accountId: string; name: string; email: string };
  createdAt?: string;
}

export type ActiveTab = 'overview' | 'employees' | 'media' | 'meetings' | 'add-employee' | 'edit-employee' | 'add-media' | 'edit-media' | 'permissions' | 'system-settings' | 'account';
