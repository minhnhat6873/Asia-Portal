# Danh sách endpoint backend

Cập nhật lần cuối: 2026-10-19. File nguồn đã đọc: `backend/src/routes/**`, `backend/src/controllers/**`, `backend/src/services/**`, `backend/src/middlewares/**`, `backend/src/validates/**`.

Tất cả endpoint đi qua middleware toàn cục tại `backend/index.ts`: Helmet, CORS, limiter public (trừ health/admin), parser, cookie parser và sanitize. `ADMIN GATE` bên dưới nghĩa là `requireAdminAuth` + limiter theo account do [index.route.ts](/D:/Vscode/Asia-Portal/backend/src/routes/index.route.ts:36) mount sẵn. Response đều bọc `success`; chi tiết tại `api-response.md`.

| Method | Path | Middleware route (ngoài global) | Controller | Service | Response data |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | — | inline | — | message trạng thái |
| GET | `/user/employees` | validate query | user `getEmployees` | `userEmployeeService.getEmployees` | danh sách public + pagination |
| GET | `/user/employees/departments` | — | user `getDepartments` | `userEmployeeService.getDepartments` | `string[]` mã phòng có nhân viên active, chưa xóa; không phân trang |
| GET | `/user/employees/:id` | — | user `getEmployeeById` | `userEmployeeService.getEmployeeById` | nhân viên public |
| GET | `/user/media` | validate query | user `getMedia` | `userMediaService.getMedia` | bài viết published + pagination |
| GET | `/user/media/:id` | — | user `getMediaById` | `userMediaService.getMediaById` | bài viết published |
| GET | `/user/meetings` | validate query | `getBookings` | `meetingService.getBookings` | `{ items, pagination }`, email được che |
| POST | `/user/meetings/booking-requests` | meeting OTP limiter, validate body | `startBookingRequest` | `meetingBookingOtpService.start` | 202; requestId, email, thời gian OTP/cooldown |
| POST | `/user/meetings/booking-requests/verify-otp` | meeting verify limiter, validate body | `verifyBookingRequest` | `meetingBookingOtpService.verify` | 201; booking mới, email được che |
| POST | `/user/meetings/booking-requests/resend-otp` | meeting OTP limiter, validate body | `resendBookingRequestOtp` | `meetingBookingOtpService.resend` | 200; thời gian OTP/cooldown |
| POST | `/user/meetings/cancel-requests` | meeting OTP limiter, validate body | `startCancellationRequest` | `meetingCancelOtpService.start` | 202; email đã che, thời gian OTP/cooldown |
| POST | `/user/meetings/cancel-requests/verify-otp` | meeting verify limiter, validate body | `verifyCancellationRequest` | `meetingCancelOtpService.verify` | 200; booking vừa xóa, email được che |
| POST | `/user/meetings/cancel-requests/resend-otp` | meeting OTP limiter, validate body | `resendCancellationRequestOtp` | `meetingCancelOtpService.resend` | 200; thời gian OTP/cooldown |
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
| POST | `/admin/auth/password/request-otp` | auth, OTP send limiter, body currentPassword/newPassword | `requestPasswordChangeOtp` | `passwordChangeOtpService.request` | requestId, email, expiresInSeconds, resendAfterSeconds (202) |
| POST | `/admin/auth/password/resend-otp` | auth, OTP send limiter, body requestId | `resendPasswordChangeOtp` | `passwordChangeOtpService.resend` | requestId, email, expiresInSeconds, resendAfterSeconds |
| PATCH | `/admin/auth/password` | auth, OTP verify limiter, body requestId/code | `changePassword` | `passwordChangeOtpService.confirm` | message; đổi mật khẩu khi OTP đúng |
| POST | `/admin/auth/email/request-otp` | auth, email OTP send limiter, body newEmail | `requestEmailChangeOtp` | `emailChangeOtpService.request` | requestId, email (mới), expiresInSeconds, resendAfterSeconds (202) |
| POST | `/admin/auth/email/resend-otp` | auth, email OTP send limiter, body requestId | `resendEmailChangeOtp` | `emailChangeOtpService.resend` | metadata OTP mới |
| PATCH | `/admin/auth/email` | auth, email OTP verify limiter, body requestId/code | `changeEmail` | `emailChangeOtpService.confirm` | `{ email }`; chỉ đổi sau xác nhận OTP |
| GET | `/admin/auth/me` | auth, session limiter | `getCurrentAccount` | — | `request.admin` |
| GET | `/admin/dashboard/summary` | ADMIN GATE, `dashboard:view` | `getDashboardSummary` | `adminDashboardService.getSummary` | các số tổng hợp |
| GET | `/admin/employees` | ADMIN GATE, `employees:view`, validate query | `getEmployees` | `adminEmployeeService.getEmployees` | danh sách + pagination |
| GET | `/admin/employees/trash` | ADMIN GATE, `employees:trash`, validate query | `getDeletedEmployees` | `adminEmployeeService.getDeletedEmployees` | thùng rác + pagination |
| GET | `/admin/employees/:id` | ADMIN GATE, `employees:view` | `getEmployeeById` | `adminEmployeeService.getEmployeeById` | nhân viên |
| POST | `/admin/employees` | ADMIN GATE, `employees:create`, Cloudinary, multipart avatar, validate upload | `createEmployee` | `adminEmployeeService.createEmployee` + audit | nhân viên (201) |
| PATCH | `/admin/employees/:id` | ADMIN GATE, Cloudinary, multipart avatar, validate upload, `employees:update` | `updateEmployee` | `adminEmployeeService.updateEmployee` + audit | nhân viên |
| POST | `/admin/employees/:id/restore` | ADMIN GATE, `employees:trash` | `restoreEmployee` | `adminEmployeeService.restoreEmployee` + audit | nhân viên |
| DELETE | `/admin/employees/:id/permanent` | ADMIN GATE, `employees:trash` | `permanentlyDeleteEmployee` | `adminEmployeeService.permanentlyDeleteEmployee` + audit | nhân viên |
| DELETE | `/admin/employees/:id` | ADMIN GATE, `employees:delete` | `softDeleteEmployee` | `adminEmployeeService.softDeleteEmployee` + audit | nhân viên |
| GET | `/admin/media` | ADMIN GATE, `media:view`, validate query | `getMedia` | `adminMediaService.getMedia` | bài viết + pagination |
| GET | `/admin/media/:id` | ADMIN GATE, `media:view` | `getMediaById` | `adminMediaService.getMediaById` | bài viết |
| POST | `/admin/media` | ADMIN GATE, `media:create`, Cloudinary, multipart cover, validate upload | `createMedia` | `adminMediaService.createMedia` + audit | bài viết (201) |
| PATCH | `/admin/media/:id` | ADMIN GATE, Cloudinary, multipart cover, validate upload, quyền update/publish | `updateMedia` | `adminMediaService.updateMedia` + audit | bài viết |
| DELETE | `/admin/media/:id` | ADMIN GATE, `media:delete` | `softDeleteMedia` | `adminMediaService.softDeleteMedia` + audit | bài viết đã chuyển vào thùng rác |
| GET | `/admin/media/trash` | ADMIN GATE, `media:trash`, validate query | `getDeletedMedia` | `adminMediaService.getMedia(query, true)` | bài trong thùng rác + pagination |
| POST | `/admin/media/:id/restore` | ADMIN GATE, `media:trash`, body rỗng | `restoreMedia` | `adminMediaService.restoreMedia` + audit | bài khôi phục ở trạng thái draft |
| DELETE | `/admin/media/:id/permanent` | ADMIN GATE, `media:trash` | `permanentlyDeleteMedia` | `adminMediaService.permanentlyDeleteMedia` + audit | chỉ xóa vĩnh viễn bài trong thùng rác |
| GET | `/admin/audit-logs` | ADMIN GATE, role `admin`, validate query | `getAuditLogs` | `auditLogService.getAuditLogs` | audit logs + pagination |
| DELETE | `/admin/accounts/:id` | ADMIN GATE, role `admin` | `deleteAccount` | `adminAccountService.deleteAccount` + audit | `{ id }`; gồm Admin khác, chặn tự xóa/Admin active cuối cùng |
| GET | `/admin/accounts` | ADMIN GATE, role `admin` | `getAccounts` | `adminAccountService.getAccounts` | account[] |
| POST | `/admin/accounts/check-contacts` | ADMIN GATE, role `admin`, validate body | `checkAccountContacts` | `accountContactService.check` | `{ emailAvailable?, phoneAvailable? }` từ MongoDB |
| POST | `/admin/accounts` | ADMIN GATE, role `admin`, validate body | `createAccount` | `adminAccountService.createAccount` | account (201) |
| PATCH | `/admin/accounts/:id` | ADMIN GATE, role `admin`, validate body | `updateAccount` | `adminAccountService.updateAccount` | account |
| PATCH | `/admin/accounts/:id/password` | ADMIN GATE, role `admin`, validate body | `resetPassword` | `adminAccountService.resetPassword` | message |
| GET | `/admin/permission-groups/catalog` | ADMIN GATE, role `admin` | `getPermissionCatalog` | — | `{ modules, permissions }` (16 quyền) |
| GET | `/admin/permission-groups` | ADMIN GATE, role `admin` | `getGroups` | `permissionGroupService.getGroups` | group[] |
| POST | `/admin/permission-groups` | ADMIN GATE, role `admin`, validate body | `createGroup` | `permissionGroupService.createGroup` | group (201) |
| PATCH | `/admin/permission-groups/:id` | ADMIN GATE, role `admin`, validate body | `updateGroup` | `permissionGroupService.updateGroup` | group |
| DELETE | `/admin/permission-groups/:id` | ADMIN GATE, role `admin` | `deleteGroup` | `permissionGroupService.deleteGroup` + audit | `{ id }`; xóa nhóm và gỡ nhóm khỏi tài khoản |

Media có thùng rác: `DELETE /admin/media/:id` là xóa mềm, giữ nội dung và ảnh để khôi phục. Các thao tác xem thùng rác, khôi phục và xóa vĩnh viễn cần quyền `media:trash`. Khôi phục luôn về Ẩn tin. Chi tiết tại [media-trash.md](media-trash.md).

Meeting là API public, không yêu cầu đăng nhập. Booking start/verify/resend nhận JSON body; cancel start/resend nhận `{ bookingId }`, cancel verify nhận `{ bookingId, code }`. GET hỗ trợ `dateFrom`, `dateTo`, `roomId`, `department`, `search`, `page`, `limit`. Payload chi tiết ở `api-response.md`.

Tham số `search` của hai danh sách quản trị được trim, gộp khoảng trắng, chuyển về chữ thường và bỏ dấu tiếng Việt (`đ` thành `d`) trước khi partial match. `/admin/employees` chỉ áp dụng trên mã và tên nhân viên; `/admin/media` chỉ áp dụng trên tiêu đề và `summary` (Sapo). API public giữ cơ chế tìm kiếm hiện tại.

Khi tạo/cập nhật bài truyền thông, trường `authorDepartment` chỉ nhận `Phòng Thiết kế`, `Phòng Marketing & Truyền thông` hoặc `Phòng Nhân sự & Hành chính`; gửi đơn vị khác trả 400. PATCH không gửi trường này giữ nguyên đơn vị hiện tại. Đây là danh mục đơn vị đứng tên bài viết; quyền tài khoản vẫn theo `media:create`, `media:update`, `media:publish`.

Khi tạo/cập nhật nhân viên, cấp bậc `CEO` chỉ được dùng với phòng ban `BOD`; sai tổ hợp trả 400. Với PATCH chỉ gửi một trong hai trường, service kiểm tra tổ hợp sau khi ghép với dữ liệu hiện tại. Quy tắc chỉ có một CEO vẫn được giữ (409 khi trùng).

`GET /admin/employees` mặc định sắp xếp theo `createdAt` giảm dần (mới nhất trước), tương đương `sort=latest`. `sort=oldest` sắp xếp theo `createdAt` tăng dần. Khi trùng thời điểm tạo, `_id` được dùng cùng chiều để ổn định thứ tự phân trang. Thứ tự này áp dụng trước khi phân trang, cả khi tìm kiếm/lọc; giao diện quản trị giữ nguyên thứ tự API trả về. Ngày vào làm (`joinDate`) và mã nhân viên không quyết định thứ tự danh sách này.

Cấp bậc nhân viên gồm `CEO`, `Senior Management`, `Middle Management`, `Intermediate Personnel` và `Staff`. Chỉ có một hồ sơ CEO chưa bị xóa mềm tại một thời điểm; quy tắc này được kiểm tra khi tạo, cập nhật và khôi phục, đồng thời được bảo vệ bằng partial unique index trong MongoDB.

API quản trị lịch họp: xem [admin-meetings.md](admin-meetings.md) để biết 10 endpoint, quyền, bộ lọc và quy tắc cập nhật.
