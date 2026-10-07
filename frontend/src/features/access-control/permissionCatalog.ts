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
];

export const ACCESS_PERMISSIONS: SystemPermission[] = [
  { id: "dashboard:view", code: "DASHBOARD_VIEW", name: "Xem bảng điều khiển", description: "Xem số liệu tổng quan trong khu vực quản trị.", module: "employees", riskLevel: "low" },
  { id: "employees:view", code: "EMPLOYEES_VIEW", name: "Xem danh sách nhân sự", description: "Xem hồ sơ nhân viên trong khu vực quản trị.", module: "employees", riskLevel: "low" },
  { id: "employees:create", code: "EMPLOYEES_CREATE", name: "Thêm nhân viên", description: "Tạo hồ sơ nhân viên mới.", module: "employees", riskLevel: "medium" },
  { id: "employees:update", code: "EMPLOYEES_UPDATE", name: "Cập nhật nhân viên", description: "Chỉnh sửa thông tin nhân viên.", module: "employees", riskLevel: "medium" },
  { id: "employees:deactivate", code: "EMPLOYEES_DEACTIVATE", name: "Ngừng hiển thị nhân viên", description: "Chuyển trạng thái hồ sơ nhân viên sang inactive.", module: "employees", riskLevel: "high" },
  { id: "employees:delete", code: "EMPLOYEES_DELETE", name: "Quản lý thùng rác nhân viên", description: "Khôi phục hoặc chuyển hồ sơ nhân viên vào thùng rác.", module: "employees", riskLevel: "high" },
];
