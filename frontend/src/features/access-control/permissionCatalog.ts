import { ModuleCategory, SystemPermission } from "./types";

export const ACCESS_MODULES: ModuleCategory[] = [
  {
    id: "system",
    name: "Quản lí Manager",
    code: "MANAGER",
    description: "Duyệt tài khoản, phân quyền và quản trị danh mục quyền.",
    iconName: "ShieldCheck",
  },
  {
    id: "hr",
    name: "Quản lí Nhân Sự",
    code: "HR",
    description: "Quản lí hồ sơ và thông tin nhân sự.",
    iconName: "Users",
  },
  {
    id: "menu",
    name: "Quản Lí Truyền Thông",
    code: "MEDIA",
    description: "Quản lí nội dung và thông tin truyền thông.",
    iconName: "Newspaper",
  },
];

export const ACCESS_PERMISSIONS: SystemPermission[] = [
  {
    id: "manager_review_and_assign",
    code: "MANAGER_REVIEW_ASSIGN",
    name: "Xem, duyệt tài khoản và phân quyền",
    description: "Xem và duyệt tài khoản mới; chỉ gán các quyền đã được tạo trong hệ thống.",
    module: "system",
    riskLevel: "high",
  },
  {
    id: "manager_manage_permissions",
    code: "MANAGER_PERMISSION_CRUD",
    name: "Thêm, sửa, xóa quyền",
    description: "Tạo mới, cập nhật hoặc xóa các quyền trong danh mục hệ thống.",
    module: "system",
    riskLevel: "high",
  },
  {
    id: "hr_view_employee",
    code: "HR_VIEW_EMPLOYEE",
    name: "Xem nhân sự và thông tin nhân sự",
    description: "Xem danh sách nhân sự và các thông tin hồ sơ liên quan.",
    module: "hr",
    riskLevel: "medium",
  },
  {
    id: "hr_manage_employee",
    code: "HR_EMPLOYEE_CRUD",
    name: "Thêm, sửa, xóa nhân sự",
    description: "Tạo mới, cập nhật hoặc xóa hồ sơ nhân sự.",
    module: "hr",
    riskLevel: "high",
  },
  {
    id: "media_view_content",
    code: "MEDIA_VIEW_CONTENT",
    name: "Xem truyền thông và thông tin truyền thông",
    description: "Xem danh sách nội dung và thông tin truyền thông.",
    module: "menu",
    riskLevel: "medium",
  },
  {
    id: "media_manage_content",
    code: "MEDIA_CONTENT_CRUD",
    name: "Thêm, sửa, xóa truyền thông",
    description: "Tạo mới, cập nhật hoặc xóa nội dung truyền thông.",
    module: "menu",
    riskLevel: "high",
  },
];
