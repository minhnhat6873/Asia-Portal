# Danh sách endpoint backend

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/src/routes/**`, `backend/src/controllers/**`, `backend/src/services/**`, `backend/src/middlewares/**`, `backend/src/validates/**`.

Tất cả endpoint đi qua middleware toàn cục tại `backend/index.ts`: Helmet, CORS, limiter public (trừ health/admin), parser, cookie parser và sanitize. `ADMIN GATE` bên dưới nghĩa là `requireAdminAuth` + limiter theo account do [index.route.ts](/D:/Vscode/Asia-Portal/backend/src/routes/index.route.ts:36) mount sẵn. Response đều bọc `success`; chi tiết tại `api-response.md`.

| Method | Path | Middleware route (ngoài global) | Controller | Service | Response data |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | — | inline | — | message trạng thái |
| GET | `/user/employees` | validate query | user `getEmployees` | `userEmployeeService.getEmployees` | danh sách public + pagination |
| GET | `/user/employees/:id` | — | user `getEmployeeById` | `userEmployeeService.getEmployeeById` | nhân viên public |
| GET | `/user/media` | validate query | user `getMedia` | `userMediaService.getMedia` | bài viết published + pagination |
| GET | `/user/media/:id` | — | user `getMediaById` | `userMediaService.getMediaById` | bài viết published |
| POST | `/admin/auth/login` | login limiter, body login | `login` | `adminAuthService.login` | admin; set cookie |
| POST | `/admin/auth/register` | register limiter, body register | `register` | `registrationOtpService.start` | email, `expiresInSeconds` (202) |
| POST | `/admin/auth/register/verify-otp` | register limiter, body OTP | `verifyRegistrationOtp` | `registrationOtpService.verify` | account pending (201) |
| POST | `/admin/auth/register/resend-otp` | register limiter, body email | `resendRegistrationOtp` | `registrationOtpService.resend` | `expiresInSeconds` |
| POST | `/admin/auth/forgot-password` | register limiter, body email | `requestPasswordResetOtp` | `passwordResetOtpService.start` | email, `expiresInSeconds` (202) |
| POST | `/admin/auth/forgot-password/verify-otp` | register limiter, body OTP | `verifyPasswordResetOtp` | `passwordResetOtpService.verify` | message |
| POST | `/admin/auth/forgot-password/reset` | register limiter, body reset | `resetPasswordWithOtp` | `passwordResetOtpService.reset` | message |
| POST | `/admin/auth/forgot-password/resend-otp` | register limiter, body email | `resendPasswordResetOtp` | `passwordResetOtpService.resend` | `expiresInSeconds` |
| POST | `/admin/auth/refresh` | refresh limiter | `refreshLogin` | `adminAuthService.refresh` | admin; set access cookie |
| POST | `/admin/auth/logout` | — | `logout` | — | message; clear cookies |
| GET | `/admin/auth/me` | auth, session limiter | `getCurrentAccount` | — | `request.admin` |
| GET | `/admin/dashboard/summary` | ADMIN GATE, `dashboard:view` | `getDashboardSummary` | `adminDashboardService.getSummary` | các số tổng hợp |
| GET | `/admin/employees` | ADMIN GATE, `employees:view`, validate query | `getEmployees` | `adminEmployeeService.getEmployees` | danh sách + pagination |
| GET | `/admin/employees/trash` | ADMIN GATE, `employees:delete`, validate query | `getDeletedEmployees` | `adminEmployeeService.getDeletedEmployees` | thùng rác + pagination |
| GET | `/admin/employees/:id` | ADMIN GATE, `employees:view` | `getEmployeeById` | `adminEmployeeService.getEmployeeById` | nhân viên |
| POST | `/admin/employees` | ADMIN GATE, `employees:create`, Cloudinary, multipart avatar, validate upload | `createEmployee` | `adminEmployeeService.createEmployee` + audit | nhân viên (201) |
| PATCH | `/admin/employees/:id` | ADMIN GATE, Cloudinary, multipart avatar, validate upload, quyền update/deactivate | `updateEmployee` | `adminEmployeeService.updateEmployee` + audit | nhân viên |
| POST | `/admin/employees/:id/restore` | ADMIN GATE, `employees:delete` | `restoreEmployee` | `adminEmployeeService.restoreEmployee` + audit | nhân viên |
| DELETE | `/admin/employees/:id/permanent` | ADMIN GATE, `employees:delete` | `permanentlyDeleteEmployee` | `adminEmployeeService.permanentlyDeleteEmployee` + audit | nhân viên |
| DELETE | `/admin/employees/:id` | ADMIN GATE, `employees:delete` | `softDeleteEmployee` | `adminEmployeeService.softDeleteEmployee` + audit | nhân viên |
| GET | `/admin/media` | ADMIN GATE, `media:view`, validate query | `getMedia` | `adminMediaService.getMedia` | bài viết + pagination |
| GET | `/admin/media/:id` | ADMIN GATE, `media:view` | `getMediaById` | `adminMediaService.getMediaById` | bài viết |
| POST | `/admin/media` | ADMIN GATE, `media:create`, Cloudinary, multipart cover, validate upload | `createMedia` | `adminMediaService.createMedia` + audit | bài viết (201) |
| PATCH | `/admin/media/:id` | ADMIN GATE, Cloudinary, multipart cover, validate upload, quyền update/publish | `updateMedia` | `adminMediaService.updateMedia` + audit | bài viết |
| DELETE | `/admin/media/:id` | ADMIN GATE, `media:delete` | `permanentlyDeleteMedia` | `adminMediaService.permanentlyDeleteMedia` + audit | bài viết đã xóa vĩnh viễn |
| GET | `/admin/audit-logs` | ADMIN GATE, role `admin`, validate query | `getAuditLogs` | `auditLogService.getAuditLogs` | audit logs + pagination |
| GET | `/admin/accounts` | ADMIN GATE, role `admin` | `getAccounts` | `adminAccountService.getAccounts` | account[] |
| POST | `/admin/accounts` | ADMIN GATE, role `admin`, validate body | `createAccount` | `adminAccountService.createAccount` | account (201) |
| PATCH | `/admin/accounts/:id` | ADMIN GATE, role `admin`, validate body | `updateAccount` | `adminAccountService.updateAccount` | account |
| PATCH | `/admin/accounts/:id/password` | ADMIN GATE, role `admin`, validate body | `resetPassword` | `adminAccountService.resetPassword` | message |
| GET | `/admin/permission-groups` | ADMIN GATE, role `admin` | `getGroups` | `permissionGroupService.getGroups` | group[] |
| POST | `/admin/permission-groups` | ADMIN GATE, role `admin`, validate body | `createGroup` | `permissionGroupService.createGroup` | group (201) |
| PATCH | `/admin/permission-groups/:id` | ADMIN GATE, role `admin`, validate body | `updateGroup` | `permissionGroupService.updateGroup` | group |

Media không có thùng rác: `DELETE /admin/media/:id` xóa document khỏi MongoDB ngay và cố gắng dọn ảnh Cloudinary. Nguồn route trực tiếp: [admin auth](/D:/Vscode/Asia-Portal/backend/src/routes/admin/auth.route.ts:78), [admin employee](/D:/Vscode/Asia-Portal/backend/src/routes/admin/employee.route.ts:30), [admin media](/D:/Vscode/Asia-Portal/backend/src/routes/admin/media.route.ts), [account](/D:/Vscode/Asia-Portal/backend/src/routes/admin/account.route.ts:18), [permission group](/D:/Vscode/Asia-Portal/backend/src/routes/admin/permission-group.route.ts:16), [user employee](/D:/Vscode/Asia-Portal/backend/src/routes/user/employee.route.ts:12), [user media](/D:/Vscode/Asia-Portal/backend/src/routes/user/media.route.ts).

Tham số `search` của hai danh sách quản trị được trim, gộp khoảng trắng, chuyển về chữ thường và bỏ dấu tiếng Việt (`đ` thành `d`) trước khi partial match. `/admin/employees` chỉ áp dụng trên mã và tên nhân viên; `/admin/media` chỉ áp dụng trên tiêu đề và `summary` (Sapo). API public giữ cơ chế tìm kiếm hiện tại.

Cấp bậc nhân viên gồm `CEO`, `Senior Management`, `Middle Management`, `Intermediate Personnel` và `Staff`. Chỉ có một hồ sơ CEO chưa bị xóa mềm tại một thời điểm; quy tắc này được kiểm tra khi tạo, cập nhật và khôi phục, đồng thời được bảo vệ bằng partial unique index trong MongoDB.
