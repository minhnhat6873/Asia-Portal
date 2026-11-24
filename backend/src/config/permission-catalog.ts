import type { PermissionAction } from "../interfaces/permission-group.interface";

export const PERMISSION_MODULES = [
  { id: "meetings", name: "Quản lý đặt phòng họp", code: "MEETINGS", description: "Lịch họp và yêu cầu xác thực.", iconName: "CalendarDays" },
  { id: "employees", name: "Quản lý nhân sự", code: "EMPLOYEES", description: "Hồ sơ và thùng rác nhân viên.", iconName: "Users" },
  { id: "media", name: "Quản lý truyền thông", code: "MEDIA", description: "Bài viết truyền thông.", iconName: "Newspaper" },
  { id: "dashboard", name: "Bảng điều khiển", code: "DASHBOARD", description: "Thống kê tổng quan.", iconName: "LayoutDashboard" },
  { id: "accounts", name: "Quản lý tài khoản", code: "ACCOUNTS", description: "Tài khoản đăng nhập của người dùng.", iconName: "UserCheck" },
  { id: "vehicles", name: "Quản lý đặt xe", code: "VEHICLES", description: "Yêu cầu đặt xe đón khách và giao hàng.", iconName: "Car" },
] as const;

type PermissionDefinition = { id: PermissionAction; name: string; description: string; module: typeof PERMISSION_MODULES[number]["id"]; riskLevel: "low" | "medium" | "high" };
const definitions: PermissionDefinition[] = [
  { id: "meetings:view", name: "Xem lịch họp", description: "Xem lịch, lịch sử và các yêu cầu xác thực.", module: "meetings", riskLevel: "low" },
  { id: "meetings:create", name: "Thêm lịch họp", description: "Tạo lịch họp.", module: "meetings", riskLevel: "medium" },
  { id: "meetings:update", name: "Chỉnh sửa lịch họp", description: "Chỉnh sửa lịch họp theo trạng thái cuộc họp.", module: "meetings", riskLevel: "medium" },
  { id: "meetings:delete", name: "Xóa lịch và thu hồi yêu cầu", description: "Xóa lịch hoặc thu hồi yêu cầu xác thực.", module: "meetings", riskLevel: "high" },
  { id: "employees:view", name: "Xem danh sách nhân viên", description: "Xem danh sách và hồ sơ nhân viên.", module: "employees", riskLevel: "low" },
  { id: "employees:view-birth-date", name: "Xem ngày sinh", description: "Xem ngày sinh trong danh sách, hồ sơ và form chỉnh sửa.", module: "employees", riskLevel: "high" },
  { id: "employees:create", name: "Thêm nhân viên / Nhập Excel", description: "Tạo hồ sơ nhân viên và nhập danh sách nhân viên từ Excel.", module: "employees", riskLevel: "medium" },
  { id: "employees:update", name: "Chỉnh sửa nhân viên", description: "Sửa thông tin, trạng thái làm việc và ảnh sơ đồ.", module: "employees", riskLevel: "medium" },
  { id: "employees:delete", name: "Chuyển vào thùng rác", description: "Chuyển hồ sơ nhân viên vào thùng rác.", module: "employees", riskLevel: "high" },
  { id: "employees:trash", name: "Quản lý thùng rác", description: "Xem thùng rác, khôi phục và xóa vĩnh viễn nhân viên.", module: "employees", riskLevel: "high" },
  { id: "media:view", name: "Xem danh sách bài viết", description: "Xem danh sách và nội dung bài viết.", module: "media", riskLevel: "low" },
  { id: "media:create", name: "Thêm bài viết", description: "Tạo bài viết mới ở trạng thái Ẩn Tin.", module: "media", riskLevel: "medium" },
  { id: "media:update", name: "Chỉnh sửa bài viết", description: "Chỉnh sửa nội dung và ngày hết hạn bài viết.", module: "media", riskLevel: "medium" },
  { id: "media:publish", name: "Đăng tin / Ẩn Tin", description: "Thay đổi trạng thái hiển thị bài viết.", module: "media", riskLevel: "high" },
  { id: "media:delete", name: "Chuyển bài vào thùng rác", description: "Xóa mềm bài viết; vẫn giữ nội dung và ảnh để khôi phục.", module: "media", riskLevel: "high" },
  { id: "media:trash", name: "Quản lý thùng rác truyền thông", description: "Xem thùng rác, khôi phục về Ẩn tin và xóa vĩnh viễn bài viết.", module: "media", riskLevel: "high" },
  { id: "dashboard:view", name: "Xem bảng điều khiển", description: "Xem số liệu tổng quan quản trị.", module: "dashboard", riskLevel: "low" },
  { id: "vehicles:manage", name: "Quản lý đặt xe", description: "Xem yêu cầu đặt xe, chọn xe công ty hoặc xe ngoài, sửa, hủy, chốt chuyến, nhập giá và xem báo cáo chi phí.", module: "vehicles", riskLevel: "medium" },
  { id: "vehicles:delete", name: "Xóa chuyến xe đã hủy", description: "Xóa hẳn chuyến xe đã hủy (đặt thử, đặt nhầm). Chuyến đã hoàn thành không bao giờ xóa được.", module: "vehicles", riskLevel: "high" },
  { id: "accounts:manage-users", name: "Quản lý tài khoản người dùng", description: "Xem, tạo, sửa, khóa, xóa và đặt lại mật khẩu tài khoản Người dùng. Không đổi được loại tài khoản, không đụng tới tài khoản Quản lý hay Admin gốc.", module: "accounts", riskLevel: "high" },
  { id: "accounts:trash", name: "Quản lý thùng rác tài khoản", description: "Xem thùng rác tài khoản, khôi phục và xóa vĩnh viễn. Cần kèm quyền Quản lý tài khoản người dùng; Quản lý chỉ thấy tài khoản Người dùng.", module: "accounts", riskLevel: "high" },
];
export const PERMISSION_CATALOG = definitions.map((permission) => ({ ...permission, code: permission.id.toUpperCase().replace(/[:-]/g, "_") }));
