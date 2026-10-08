import { ModuleCategory, SystemPermission } from "./types";

// This catalogue mirrors PERMISSION_ACTIONS in the backend.  Do not add a UI-only
// permission here: the API is the source of truth for every granted action.
export const ACCESS_MODULES: ModuleCategory[] = [
  {
    id: "employees",
    name: "Quản lý nhân sự",
    code: "EMPLOYEES",
    description: "Các thao tác được backend cho phép đối với hồ sơ nhân viên.",
    iconName: "Users",
  },
  {
    id: "media",
    name: "Quản lý truyền thông",
    code: "MEDIA",
    description: "Các thao tác quản lý và xuất bản bài viết truyền thông.",
    iconName: "Newspaper",
  },
];

export const ACCESS_PERMISSIONS: SystemPermission[] = [
  { id: "dashboard:view", code: "DASHBOARD_VIEW", name: "Xem bảng điều khiển", description: "Xem số liệu tổng quan trong khu vực quản trị.", module: "employees", riskLevel: "low" },
  { id: "employees:view", code: "EMPLOYEES_VIEW", name: "Xem danh sách nhân sự", description: "Xem hồ sơ nhân viên trong khu vực quản trị.", module: "employees", riskLevel: "low" },
  { id: "employees:create", code: "EMPLOYEES_CREATE", name: "Thêm nhân viên", description: "Tạo hồ sơ nhân viên mới.", module: "employees", riskLevel: "medium" },
  { id: "employees:update", code: "EMPLOYEES_UPDATE", name: "Cập nhật nhân viên", description: "Chỉnh sửa thông tin nhân viên.", module: "employees", riskLevel: "medium" },
  { id: "employees:deactivate", code: "EMPLOYEES_DEACTIVATE", name: "Ngừng hiển thị nhân viên", description: "Chuyển trạng thái hồ sơ nhân viên sang inactive.", module: "employees", riskLevel: "high" },
  { id: "employees:delete", code: "EMPLOYEES_DELETE", name: "Quản lý thùng rác nhân viên", description: "Khôi phục hoặc chuyển hồ sơ nhân viên vào thùng rác.", module: "employees", riskLevel: "high" },
  { id: "media:view", code: "MEDIA_VIEW", name: "Xem truyền thông", description: "Xem danh sách bài viết quản trị.", module: "media", riskLevel: "low" },
  { id: "media:create", code: "MEDIA_CREATE", name: "Tạo bài viết", description: "Tạo bài viết truyền thông mới.", module: "media", riskLevel: "medium" },
  { id: "media:update", code: "MEDIA_UPDATE", name: "Cập nhật bài viết", description: "Chỉnh sửa nội dung bài viết.", module: "media", riskLevel: "medium" },
  { id: "media:publish", code: "MEDIA_PUBLISH", name: "Xuất bản bài viết", description: "Đổi trạng thái xuất bản hoặc bản nháp.", module: "media", riskLevel: "high" },
  { id: "media:delete", code: "MEDIA_DELETE", name: "Xóa bài viết", description: "Xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu.", module: "media", riskLevel: "high" },
];
