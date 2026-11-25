# Danh sách endpoint backend

Cập nhật lần cuối: 2026-11-23. File nguồn đã đọc: `backend/src/routes/**`, `backend/src/controllers/**`, `backend/src/services/**`, `backend/src/middlewares/**`, `backend/src/validates/**`.

Tất cả endpoint đi qua middleware toàn cục tại `backend/index.ts`: Helmet, CORS, limiter public (trừ health/admin), parser, cookie parser, sanitize và CSRF cho mọi request ghi /admin (X-Requested-With: AsiaPortal + kiểm tra nguồn). `ADMIN GATE` bên dưới nghĩa là `requireAdminAuth` + limiter theo account do [index.route.ts](/D:/Vscode/Asia-Portal/backend/src/routes/index.route.ts:36) mount sẵn. `USER GATE` nghĩa là `requireUserAuth` (cookie `asia_user_token` của cổng người dùng; token cổng quản trị không được nhận) + kiểm tra CSRF cho request ghi; khách nhận 401 trước khi chạm database. Response đều bọc `success`; chi tiết tại `api-response.md`.

| Method | Path | Middleware route (ngoài global) | Controller | Service | Response data |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | — | inline | — | message trạng thái |
| GET | `/user/employees` | USER GATE, validate query | user `getEmployees` | `userEmployeeService.getEmployees` | danh sách nhân viên + pagination; khách nhận 401 |
| GET | `/user/employees/departments` | USER GATE | user `getDepartments` | `userEmployeeService.getDepartments` | `string[]` mã phòng có nhân viên active, chưa xóa; không phân trang |
| GET | `/user/employees/:id` | USER GATE | user `getEmployeeById` | `userEmployeeService.getEmployeeById` | nhân viên |
| GET | `/user/media` | USER GATE, validate query | user `getMedia` | `userMediaService.getMedia` | bài published + pagination; khách nhận 401 |
| GET | `/user/media/:id` | USER GATE | user `getMediaById` | `userMediaService.getMediaById` | bài published; khách nhận 401 |
| GET | `/user/meetings` | USER GATE | `getBookings` | `meetingService.getBookings` | `{ items, pagination }`, email được che, `isMine` cho lịch của người đang xem |
| GET | `/user/meetings/mine` | USER GATE | `getMyBookings` | `userMeetingBookingService.mine` | `{ upcoming, past }` (15 ngày gần nhất), email đầy đủ của chính mình |
| POST | `/user/meetings/bookings` | USER GATE, limiter theo account, validate body | `bookMeeting` | `userMeetingBookingService.book` | 201; booking mới. Tên/email lấy từ tài khoản, bỏ qua giá trị gửi lên; không còn OTP |
| POST | `/user/meetings/bookings/:id/cancel` | USER GATE, limiter theo account | `cancelMyBooking` | `userMeetingBookingService.cancel` | chỉ người đặt (cùng email) hủy được, trước khi họp kết thúc; người khác nhận 404 |
| POST | `/user/feedback` | USER GATE, limiter | `createFeedback` | `userFeedbackService.create` | 201; gửi có tên thì tên/email lấy từ tài khoản |
| GET | `/user/account/profile` | USER GATE | `getProfile` | `userProfileService.profile` | tài khoản + hồ sơ nhân viên cùng email (chỉ xem) |
| POST | `/user/account/change-password` | USER GATE, limiter theo account, validate body | `changePassword` | `userAuthService.changePassword` | đổi mật khẩu, thu hồi mọi phiên, cấp phiên mới cho thiết bị hiện tại |
| POST | `/user/account/logout-others` | USER GATE | `logoutOtherDevices` | `userAuthService.logoutOthers` | `{ count }` phiên đã đăng xuất |
| POST | `/user/account/avatar` | USER GATE, limiter theo account, multipart `avatar` (JPG/PNG/WEBP ≤ 5MB, Cloudinary `asia-portal/account-avatars`) | `uploadAvatar` | `accountAvatarService.set` | `{ avatar, customAvatar: true }`; xóa file ảnh riêng cũ. Không đổi ảnh hồ sơ nhân sự |
| DELETE | `/user/account/avatar` | USER GATE, limiter theo account | `removeAvatar` | `accountAvatarService.clear` | `{ avatar, customAvatar: false }`: quay về ảnh hồ sơ nhân sự cùng email (hoặc rỗng) |
| GET | `/user/notifications` | USER GATE, validate query (`before`) | `listNotifications` | `notificationService.list` | `{ items, unread, hasMore }`, 20 mục mỗi trang |
| GET | `/user/notifications/unread-count` | USER GATE | `unreadNotifications` | `notificationService.unreadCount` | `{ unread }` |
| POST | `/user/notifications/read-all` | USER GATE | `markAllNotificationsRead` | `notificationService.markAllRead` | — |
| POST | `/user/notifications/:id/read` | USER GATE | `markNotificationRead` | `notificationService.markRead` | 404 nếu không phải thông báo của mình |
| POST | `/admin/auth/login` | login limiter, body login | `login` | `adminAuthService.login` | admin; set cookie |
| POST | `/admin/auth/register` | register limiter, body register | `register` | `registrationOtpService.start` | email, `expiresInSeconds` (202) |
| POST | `/admin/auth/register/verify-otp` | register limiter, body OTP | `verifyRegistrationOtp` | `registrationOtpService.verify` | account pending (201) |
| POST | `/admin/auth/register/resend-otp` | register limiter, body email | `resendRegistrationOtp` | `registrationOtpService.resend` | `expiresInSeconds` |
| POST | `/admin/auth/forgot-password` | register limiter, body email | `requestPasswordResetOtp` | `passwordResetOtpService.start` | email, `expiresInSeconds` (202) |
| POST | `/admin/auth/forgot-password/verify-otp` | register limiter, body OTP | `verifyPasswordResetOtp` | `passwordResetOtpService.verify` | message |
| POST | `/admin/auth/forgot-password/reset` | register limiter, body reset | `resetPasswordWithOtp` | `passwordResetOtpService.reset` | message; consume OTP + password/authVersion trong cùng transaction, một lần dùng |
| POST | `/admin/auth/forgot-password/resend-otp` | register limiter, body email | `resendPasswordResetOtp` | `passwordResetOtpService.resend` | `expiresInSeconds` |
| POST | `/admin/auth/refresh` | refresh limiter | `refreshLogin` | `adminAuthService.refresh` | admin; thay access và refresh cookie |
| POST | `/admin/auth/logout` | — | `logout` | `adminAuthService.logout` | message; thu hồi phiên và clear cookies |
| POST | `/admin/auth/password/request-otp` | auth, OTP send limiter, body currentPassword/newPassword | `requestPasswordChangeOtp` | `passwordChangeOtpService.request` | requestId, email, expiresInSeconds, resendAfterSeconds (202) |
| POST | `/admin/auth/password/resend-otp` | auth, OTP send limiter, body requestId | `resendPasswordChangeOtp` | `passwordChangeOtpService.resend` | requestId, email, expiresInSeconds, resendAfterSeconds |
| PATCH | `/admin/auth/password` | auth, OTP verify limiter, body requestId/code | `changePassword` | `passwordChangeOtpService.confirm` | message; đổi mật khẩu khi OTP đúng |
| POST | `/admin/auth/email/request-otp` | auth, email OTP send limiter, body newEmail | `requestEmailChangeOtp` | `emailChangeOtpService.request` | requestId, email (mới), expiresInSeconds, resendAfterSeconds (202) |
| POST | `/admin/auth/email/resend-otp` | auth, email OTP send limiter, body requestId | `resendEmailChangeOtp` | `emailChangeOtpService.resend` | metadata OTP mới |
| PATCH | `/admin/auth/email` | auth, email OTP verify limiter, body requestId/code | `changeEmail` | `emailChangeOtpService.confirm` | `{ email }`; chỉ đổi sau xác nhận OTP |
| GET | `/admin/auth/me` | auth, session limiter | `getCurrentAccount` | — | `request.admin` |
| GET | `/admin/auth/sessions` | auth, session limiter, validate query | `listSessions` | `adminSessionService.list` | account + items + pagination; query accountId (mặc định chính mình), page, limit tối đa 100 |
| DELETE | `/admin/auth/sessions/:id` | auth, session limiter, validate query + ID | `revokeSession` | `adminSessionService.revokeOne` | `{ signedOut }`; id là ID bản ghi, accountId tùy chọn, chỉ Admin gốc thao tác tài khoản khác |
| DELETE | `/admin/auth/sessions` | auth, session limiter, validate query | `revokeSessions` | `adminSessionService.revokeMany` | `{ signedOut }`; scope=others/all bắt buộc, accountId tùy chọn; others chỉ áp dụng chính mình |
| GET | `/admin/dashboard/summary` | ADMIN GATE, `dashboard:view` | `getDashboardSummary` | `adminDashboardService.getSummary` | các số tổng hợp |
| GET | `/admin/employees` | ADMIN GATE, `employees:view`, validate query | `getEmployees` | `adminEmployeeService.getEmployees` | danh sách + pagination |
| GET | `/admin/employees/trash` | ADMIN GATE, `employees:trash`, validate query | `getDeletedEmployees` | `adminEmployeeService.getDeletedEmployees` | thùng rác + pagination |
| GET | `/admin/employees/:id` | ADMIN GATE, `employees:view` | `getEmployeeById` | `adminEmployeeService.getEmployeeById` | nhân viên |
| POST | `/admin/employees` | ADMIN GATE, `employees:create`, Cloudinary, multipart avatar, validate upload | `createEmployee` | `adminEmployeeService.createEmployee` + audit | nhân viên (201) |
| POST | `/admin/employees/import` | ADMIN GATE, `employees:create`, multipart `file` .xlsx tối đa 2 MB | `importEmployees` | kiểm tra toàn bộ, giao dịch MongoDB + audit | `{ count }` (201) |
| PATCH | `/admin/employees/:id` | ADMIN GATE, Cloudinary, multipart avatar, validate upload, `employees:update` | `updateEmployee` | `adminEmployeeService.updateEmployee` + audit | nhân viên |
| POST | `/admin/employees/:id/restore` | ADMIN GATE, `employees:trash` | `restoreEmployee` | `adminEmployeeService.restoreEmployee` + audit | nhân viên |
| DELETE | `/admin/employees/:id/permanent` | ADMIN GATE, `employees:trash` | `permanentlyDeleteEmployee` | `adminEmployeeService.permanentlyDeleteEmployee` + audit | nhân viên |
| DELETE | `/admin/employees/:id` | ADMIN GATE, `employees:delete` | `softDeleteEmployee` | `adminEmployeeService.softDeleteEmployee` + audit | nhân viên |
| GET | `/admin/media` | ADMIN GATE, `media:view`, validate query | `getMedia` | `adminMediaService.getMedia` | bài viết + pagination; `categories` nhận danh sách cách nhau bằng dấu phẩy |
| GET | `/admin/media/:id` | ADMIN GATE, `media:view` | `getMediaById` | `adminMediaService.getMediaById` | bài viết |
| POST | `/admin/media` | ADMIN GATE, `media:create`, Cloudinary, multipart cover, validate upload | `createMedia` | `adminMediaService.createMedia` + audit | bài viết (201) |
| PATCH | `/admin/media/:id` | ADMIN GATE, Cloudinary, multipart cover, validate upload, quyền update/publish | `updateMedia` | `adminMediaService.updateMedia` + audit | bài viết |
| DELETE | `/admin/media/:id` | ADMIN GATE, `media:delete` | `softDeleteMedia` | `adminMediaService.softDeleteMedia` + audit | bài viết đã chuyển vào thùng rác |
| GET | `/admin/media/trash` | ADMIN GATE, `media:trash`, validate query | `getDeletedMedia` | `adminMediaService.getMedia(query, true)` | bài trong thùng rác + pagination |
| POST | `/admin/media/:id/restore` | ADMIN GATE, `media:trash`, body rỗng | `restoreMedia` | `adminMediaService.restoreMedia` + audit | bài khôi phục ở trạng thái draft |
| DELETE | `/admin/media/:id/permanent` | ADMIN GATE, `media:trash` | `permanentlyDeleteMedia` | `adminMediaService.permanentlyDeleteMedia` + audit | chỉ xóa vĩnh viễn bài trong thùng rác |
| GET | `/admin/audit-logs` | ADMIN GATE, role `admin`, validate query | `getAuditLogs` | `auditLogService.getAuditLogs` | audit logs + pagination |
| DELETE | `/admin/accounts/:id` | ADMIN GATE, quyền `accounts:manage-users` (Quản lý chỉ thao tác tài khoản `user`) | `deleteAccount` | `adminAccountService.deleteAccount` + audit `account.soft_deleted` | `{ id }`; **xóa mềm** vào thùng rác tài khoản; chặn tự xóa/Admin active cuối cùng |
| POST | `/admin/accounts/:id/lock` | ADMIN GATE, quyền `accounts:manage-users`, validate body `{ reason? }` (≤200 ký tự) | `lockAccount` | `adminAccountService.lockAccount` + audit `account.locked` | account; status `inactive`, `lock` = { kind: manual, note, byName, at }, đăng xuất mọi phiên; chặn tự khóa/Admin active cuối cùng |
| POST | `/admin/accounts/:id/unlock` | ADMIN GATE, quyền `accounts:manage-users` | `unlockAccount` | `adminAccountService.unlockAccount` + audit `account.unlocked` | account; status `active`, xóa `lock` |
| GET | `/admin/accounts/trash` | ADMIN GATE, quyền `accounts:manage-users` + `accounts:trash` | `getDeletedAccounts` | `adminAccountService.getDeletedAccounts` | account[] trong thùng rác (Quản lý chỉ thấy `user`) |
| PATCH | `/admin/accounts/:id/restore` | ADMIN GATE, quyền `accounts:manage-users` + `accounts:trash` | `restoreAccount` | `adminAccountService.restoreAccount` + audit `account.restored` | account; quay lại danh sách ở trạng thái khóa (`lock.kind = restored`) |
| DELETE | `/admin/accounts/:id/permanent` | ADMIN GATE, quyền `accounts:manage-users` + `accounts:trash` | `permanentlyDeleteAccount` | `adminAccountService.permanentlyDeleteAccount` + audit `account.permanently_deleted` | account; chỉ xóa tài khoản đang trong thùng rác |
| GET | `/admin/accounts` | ADMIN GATE, quyền `accounts:manage-users` (Quản lý chỉ thao tác tài khoản `user`) | `getAccounts` | `adminAccountService.getAccounts` | account[] |
| GET | `/admin/accounts/employee-lookup?q=` | ADMIN GATE, quyền `accounts:manage-users`, validate query | `lookupEmployees` | `adminAccountService.lookupEmployees` | tối đa 8 hồ sơ nhân viên chưa xóa, chưa nghỉ việc, khớp tên/mã/email (không dấu), kèm `account` nếu email đã có tài khoản |
| POST | `/admin/accounts/check-contacts` | ADMIN GATE, quyền `accounts:manage-users` (Quản lý chỉ thao tác tài khoản `user`), validate body | `checkAccountContacts` | `accountContactService.check` | `{ emailAvailable?, phoneAvailable? }` từ MongoDB |
| POST | `/admin/accounts` | ADMIN GATE, quyền `accounts:manage-users` (Quản lý chỉ thao tác tài khoản `user`), validate body | `createAccount` | `adminAccountService.createAccount` | account (201) |
| PATCH | `/admin/accounts/:id` | ADMIN GATE, quyền `accounts:manage-users` (Quản lý chỉ thao tác tài khoản `user`), validate body | `updateAccount` | `adminAccountService.updateAccount` | account |
| PATCH | `/admin/accounts/:id/password` | ADMIN GATE, quyền `accounts:manage-users` (Quản lý chỉ thao tác tài khoản `user`), validate body | `resetPassword` | `adminAccountService.resetPassword` | message |
| GET | `/admin/permission-groups/catalog` | ADMIN GATE, role `admin` | `getPermissionCatalog` | — | `{ modules, permissions }` (19 quyền) |
| GET | `/admin/permission-groups` | ADMIN GATE, role `admin` | `getGroups` | `permissionGroupService.getGroups` | group[] |
| POST | `/admin/permission-groups` | ADMIN GATE, role `admin`, validate body | `createGroup` | `permissionGroupService.createGroup` | group (201) |
| PATCH | `/admin/permission-groups/:id` | ADMIN GATE, role `admin`, validate body | `updateGroup` | `permissionGroupService.updateGroup` | group |
| DELETE | `/admin/permission-groups/:id` | ADMIN GATE, role `admin` | `deleteGroup` | `permissionGroupService.deleteGroup` + audit | `{ id }`; xóa nhóm và gỡ nhóm khỏi tài khoản |

Media có thùng rác: `DELETE /admin/media/:id` là xóa mềm, giữ nội dung và ảnh để khôi phục. Các thao tác xem thùng rác, khôi phục và xóa vĩnh viễn cần quyền `media:trash`. Khôi phục luôn về Ẩn tin. Chi tiết tại [media-trash.md](media-trash.md).

POST/PATCH nhân viên nhận hai file multipart tùy chọn: `avatar` (ảnh hiển thị) và `avatarOriginal` (ảnh gốc để cắt lại), mỗi file JPEG/PNG/WebP tối đa 5 MB. File gốc phải đi cùng ảnh hiển thị. Khi chỉ cắt lại, gửi `avatar` mới và giữ nguyên nguồn đã lưu. Khi thay ảnh gốc, gửi cả hai file. API admin trả URL `avatarOriginal`; API public không trả URL/asset ID ảnh gốc. Xóa ảnh hoặc xóa vĩnh viễn hồ sơ sẽ dọn cả hai asset; xóa mềm vẫn giữ ảnh để khôi phục. Hồ sơ cũ chưa có ảnh gốc dùng ảnh hiện có làm nguồn dự phòng, không thể phục hồi phần đã bị cắt mất.

Meeting là API public, không yêu cầu đăng nhập. Booking start/verify/resend nhận JSON body; cancel start/resend nhận `{ bookingId }`, cancel verify nhận `{ bookingId, code }`. GET hỗ trợ `dateFrom`, `dateTo`, `roomId`, `department`, `search`, `page`, `limit`. Payload chi tiết ở `api-response.md`.

Tham số `search` của hai danh sách quản trị được trim, gộp khoảng trắng, chuyển về chữ thường và bỏ dấu tiếng Việt (`đ` thành `d`) trước khi partial match. `/admin/employees` chỉ áp dụng trên mã và tên nhân viên; `/admin/media` chỉ áp dụng trên tiêu đề và `summary` (Sapo). API public giữ cơ chế tìm kiếm hiện tại.

Khi tạo/cập nhật bài truyền thông, trường `authorDepartment` chỉ nhận `Phòng Thiết kế`, `Phòng Marketing & Truyền thông` hoặc `Phòng Nhân sự & Hành chính`; gửi đơn vị khác trả 400. PATCH không gửi trường này giữ nguyên đơn vị hiện tại. Đây là danh mục đơn vị đứng tên bài viết; quyền tài khoản vẫn theo `media:create`, `media:update`, `media:publish`.

Khi tạo/cập nhật nhân viên, cấp bậc `CEO` chỉ được dùng với phòng ban `BOD`; sai tổ hợp trả 400. Với PATCH chỉ gửi một trong hai trường, service kiểm tra tổ hợp sau khi ghép với dữ liệu hiện tại. Quy tắc chỉ có một CEO vẫn được giữ (409 khi trùng).

`GET /admin/employees` mặc định sắp xếp theo `createdAt` giảm dần (mới nhất trước), tương đương `sort=latest`. `sort=oldest` sắp xếp theo `createdAt` tăng dần. Khi trùng thời điểm tạo, `_id` được dùng cùng chiều để ổn định thứ tự phân trang. Thứ tự này áp dụng trước khi phân trang, cả khi tìm kiếm/lọc; giao diện quản trị giữ nguyên thứ tự API trả về. Ngày vào làm (`joinDate`) và mã nhân viên không quyết định thứ tự danh sách này.

Cấp bậc nhân viên gồm `CEO`, `Senior Management`, `Middle Management`, `Intermediate Personnel` và `Staff`. Chỉ có một hồ sơ CEO chưa bị xóa mềm tại một thời điểm; quy tắc này được kiểm tra khi tạo, cập nhật và khôi phục, đồng thời được bảo vệ bằng partial unique index trong MongoDB.

API quản trị lịch họp: xem [admin-meetings.md](admin-meetings.md) để biết 10 endpoint, quyền, bộ lọc và quy tắc cập nhật.
# Tên đơn vị khi nhập Excel

Mẫu Excel hiển thị tên đơn vị không có tiền tố “Phòng” (ví dụ “Thiết kế”). API nhập nhân viên chấp nhận cả tên mới và tên có tiền tố trong mẫu cũ, cùng ánh xạ về mã đơn vị hiện có; không thay đổi mã lưu trong cơ sở dữ liệu.

## Đóng góp ý kiến

Xem [feedback.md](feedback.md): `POST /user/feedback` cần đăng nhập cổng người dùng; các API `/admin/feedback` yêu cầu role admin.
Tin truyền thông nổi bật: `GET /user/media?featured=true&limit=5`; xem [media-featured.md](media-featured.md).

## Thông báo và nhắc lịch họp

- Bảng `notifications` (tự xóa sau 60 ngày), mỗi tài khoản một thông báo cho mỗi cặp loại + đối tượng.
- `news`: gửi cho mọi tài khoản đang hoạt động khi một bài được đăng lần đầu (tạo ở trạng thái published, hoặc chuyển từ ẩn sang published). Trường `media.newsNotifiedAt` chặn gửi lặp; bài bị chuyển vào thùng rác thì thông báo bị thu hồi.
- `meeting-booked`: ngay sau khi đặt phòng thành công.
- `meeting-reminder`: job `meeting-booking-reminder` gửi email và thông báo trên web trước giờ họp `MEETING_REMINDER_LEAD_MINUTES` (15 phút), cho tài khoản có cùng email với lịch. Hủy lịch thì thu hồi thông báo của lịch đó.
- Lỗi khi tạo thông báo chỉ được ghi log, không làm hỏng thao tác đăng bài hay đặt phòng.

## Phạm vi bài truyền thông

Bài truyền thông không còn phạm vi Công khai/Nội bộ: cả cổng là nội bộ nên mọi bài chỉ dành cho tài khoản đã đăng nhập. Trường `visibility` còn sót trên bài cũ bị bỏ qua.

## Ảnh đại diện tài khoản

Ảnh hiển thị của một tài khoản = ảnh riêng (`account.avatar`) nếu người dùng đã tải lên, nếu không thì ảnh của hồ sơ nhân viên có cùng email, nếu không có thì rỗng (giao diện hiện chữ viết tắt). Trường `avatar` này có trong `/user/auth/me`, `/admin/auth/me`, login/refresh của hai cổng và danh sách tài khoản quản trị. Ảnh riêng không bao giờ ghi vào hồ sơ nhân viên; danh bạ và sơ đồ tổ chức vẫn dùng ảnh của phòng Nhân sự. Xóa vĩnh viễn tài khoản thì xóa luôn file ảnh riêng.

## Đặt xe

Nhân viên gửi yêu cầu (đón/đưa khách hoặc giao/nhận hàng); HR (quyền `vehicles:manage`) chọn xe công ty hoặc xe ngoài (Grab), nhập giá dự kiến và giá thật, chốt chuyến. Xóa chuyến đã hủy cần thêm quyền `vehicles:delete`. Chuyến đã hoàn thành không bao giờ xóa được.

Trạng thái: `pending` (chờ xử lý) → `arranged` (đã sắp xếp xe) → `arrived` (người đặt báo đã đi xong, tùy chọn) → `completed` (HR chốt; xe ngoài bắt buộc `actualCost`) hoặc `cancelled` (có lý do; HR hủy bắt buộc ghi lý do). Thời gian gửi lên là giờ Việt Nam dạng `YYYY-MM-DDTHH:mm`; phải đặt trước giờ đi ít nhất 15 phút.

Người đặt chọn `forOther`: `false` là đặt cho bản thân (lấy tên, email, phòng ban từ tài khoản); `true` là đặt giúp người khác, bắt buộc `forOtherName` và `forOtherPhone`. Giao/nhận hàng bắt buộc tên và SĐT người gửi, người nhận, `goodsDescription` và `goodsQuantity` (số lượng/khối lượng, ghi tự do nhưng phải có con số, ví dụ "15 thùng, 500 kg").

Kiểm tra dữ liệu (frontend `src/lib/vehicleValidation.ts` và backend dùng cùng quy tắc): số điện thoại phải là số Việt Nam (`backend/src/utils/text/vietnamPhone.ts`): di động 10 số với đầu số nhà mạng đang dùng, máy bàn 11 số bắt đầu `02`; nhận `+84`/`84`, dấu cách, chấm, gạch, ngoặc; lưu dạng `0901234567`. SĐT người gửi và người nhận không được trùng; tên người/công ty ít nhất 2 ký tự và có chữ cái; điểm đón, điểm đến ít nhất 3 ký tự và không trùng nhau; giờ đi từ 15 phút đến 90 ngày tính từ lúc đặt; khứ hồi thì giờ về sau giờ đi và không quá 30 ngày.

| Method | Path | Middleware | Ghi chú |
| --- | --- | --- | --- |
| GET | `/user/vehicles/mine` | USER GATE | chuyến của mình (60 ngày gần nhất và mọi chuyến chưa xong) |
| POST | `/user/vehicles` | USER GATE, limiter, validate | tạo yêu cầu; tên/email từ tài khoản, bộ phận từ hồ sơ nhân viên; báo HR |
| PATCH | `/user/vehicles/:id` | USER GATE, limiter, validate | chỉ khi `pending` |
| POST | `/user/vehicles/:id/cancel` | USER GATE, limiter, validate | chỉ khi `pending` |
| POST | `/user/vehicles/:id/arrived` | USER GATE, limiter, multipart `receipts` ≤ 3 ảnh | "Đã đi xong" khi `arranged`; báo HR |
| GET | `/admin/vehicles` | ADMIN GATE, `vehicles:manage` | lọc `status`, `vehicleType`, `purpose`, `month`, `search`; trả `waiting` |
| GET | `/admin/vehicles/:id` | như trên | |
| PATCH | `/admin/vehicles/:id` | như trên, validate | chọn xe/sửa chuyến; bắt buộc `expectedEndAt` (HR quyết định, người đặt không nhập); xe ngoài cần `estimatedCost`; báo người đặt. Đổi giờ đi/giờ về/điểm đón/điểm đến so với yêu cầu thì bắt buộc `changeReason` (≥ 3 ký tự): lưu vào `changes[]` và gửi người đặt qua thông báo web + email. Không đổi gì mà vẫn gửi `changeReason` thì lưu thành lời nhắn của HR (`items` rỗng) và cũng gửi người đặt. HR không sửa được `note` của người đặt |
| POST | `/admin/vehicles/:id/complete` | như trên, multipart `receipts` | chốt; bắt buộc `actualEndAt` (giờ hoàn thành thật, giờ Việt Nam, sau giờ đi và không ở tương lai); xe ngoài cần thêm `actualCost` |
| POST | `/admin/vehicles/:id/cancel` | như trên | `reason` bắt buộc |
| DELETE | `/admin/vehicles/:id` | thêm `vehicles:delete` | chỉ chuyến `cancelled`; xóa luôn ảnh |
| GET | `/admin/vehicles/report?month=YYYY-MM` | `vehicles:manage` | tổng tiền xe ngoài theo giá thật (chỉ chuyến `completed`), theo phòng ban, theo mục đích |
| GET | `/admin/vehicles/report/export?month=YYYY-MM` | `vehicles:manage` | file Excel |
| GET/POST | `/admin/notifications`, `/unread-count`, `/read-all`, `/:id/read` | ADMIN GATE | chuông thông báo trong trang quản trị |

Nhắc tự động (job `vehicle-booking-reminder`, mỗi phút): người đặt được nhắc trên web và email trước giờ đi 15 phút. HR được báo trên web khi có yêu cầu mới, khi người đặt bấm "Đã đi xong", hoặc khi quá giờ hoàn thành dự kiến mà chưa chốt. 30 phút sau lần báo đó mà vẫn chưa chốt thì gửi email cho mọi tài khoản có quyền `vehicles:manage`.
