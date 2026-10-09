# Hợp đồng response API

Cập nhật lần cuối: 2026-10-09. File nguồn đã đọc: `backend/index.ts`, `backend/src/controllers/**`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/middlewares/validate.middleware.ts`, `backend/src/middlewares/error.middleware.ts`, `backend/src/services/**`, `backend/src/repositories/user/employee.repository.ts`.

## Dạng trả về

| Trường hợp | Hình dạng thực tế |
| --- | --- |
| Thành công có dữ liệu | `{ success: true, message?, data }` |
| Thành công không dữ liệu | `{ success: true, message? }` (`/health`, logout, reset password) |
| Lỗi | `{ success: false, message, errors? }` |
| Phân trang | `data: { items, pagination: { page, limit, total, totalPages } }` |

Phân trang được tạo tại các service employee, media và audit log. Không có wrapper response dùng chung; từng controller tự gọi `response.status().json()`.

## Mã HTTP đang dùng

| Mã | Khi dùng | Ví dụ bằng chứng |
| --- | --- | --- |
| 200 | Đọc/cập nhật thành công, logout/refresh | `GET /admin/employees`, [employee.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/employee.controller.ts:50) |
| 201 | Tạo tài nguyên/xác nhận đăng ký | `POST /admin/accounts`, [account.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/account.controller.ts:30) |
| 202 | Đã nhận yêu cầu gửi OTP | `POST /admin/auth/register`, [auth.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/auth.controller.ts:90) |
| 400 | Joi, ID/OTP không hợp lệ, Multer | [error.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/error.middleware.ts:25) |
| 401 | Thiếu/sai/hết hạn access hoặc refresh token | [auth.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/auth.middleware.ts:32) |
| 403 | CORS, role hoặc permission không đủ | [auth.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/auth.middleware.ts:90) |
| 404 | Không có route hoặc không tìm thấy nhân viên/tài khoản | [index.ts](/D:/Vscode/Asia-Portal/backend/index.ts:72) |
| 409 | Trùng email/mã nhân viên/tên nhóm | [employee.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/admin/employee.service.ts:75) |
| 429 | Rate limit hoặc OTP sai/gửi lại quá giới hạn | [password-reset-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/password-reset-otp.service.ts:50) |
| 500 | Lỗi không phân loại hoặc thiếu secret/SMTP | [error.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/error.middleware.ts:59) |
| 503 | Cloudinary/email không sẵn sàng | [multerCloudinary.helper.ts](/D:/Vscode/Asia-Portal/backend/src/helpers/multerCloudinary.helper.ts:40) |

## `globalErrorHandler`

Thứ tự map ở [error.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/error.middleware.ts:17): `CORS_ORIGIN_NOT_ALLOWED` → 403; `multer.MulterError` → 400; `AppError` → `error.statusCode`; `mongoose.ValidationError` → 400; Mongo duplicate key `11000` → 409; còn lại log server và trả 500. Joi body/query không đi qua handler mà trả 400 trực tiếp.

## Phạm vi dữ liệu và ID

`GET /user/employees/departments` trả `{ success: true, data: string[] }`: danh sách phòng ban riêng biệt có ít nhất một nhân viên `status: "active"`, `isDeleted != true`. Không phân trang, không trả hồ sơ nhân viên. Phòng không có nhân viên phù hợp sẽ không xuất hiện; không có dữ liệu trả `data: []`.

- Public employee chỉ đọc bản ghi `status: "active"` và chưa xóa; repository loại `birthDate`, `gender`, `createdBy`, `avatarPublicId` ([user/employee.repository.ts](/D:/Vscode/Asia-Portal/backend/src/repositories/user/employee.repository.ts:14)). Admin nhận raw employee từ `.lean()`, nên có `_id`.
- Public media chỉ đọc bản ghi `status: "published"`, `isDeleted != true`; repository loại `createdBy`, `coverImagePublicId`, `deletedBy`, `deletedAt`, `isDeleted`. Nội dung `summary` và `content` được sanitize ở service trước khi lưu.
- Media mới mặc định có `status: "draft"`; chỉ xuất hiện ở API public sau khi được chuyển sang `published` bằng quyền `media:publish`.
- Danh sách media dùng cùng contract pagination. API media trả `_id`; frontend map `_id` thành `id` và đổi `publishDate` ISO thành `dd/MM/yyyy`.
- Xóa media là xóa vĩnh viễn, response thành công vẫn có `{ success: true, message, data }`; không có API trash/restore cho media.
- Account và permission group được map `_id` sang `id` trong `toAccountResponse` và `toResponse` ([account.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/admin/account.service.ts:16), [permission-group.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/admin/permission-group.service.ts:14)). Audit log, employee và dashboard không map tương tự; đây là không nhất quán quan sát được.

## Meeting public API

Các endpoint meeting trả wrapper `{ success, message, data }`; không trả OTP/hash. Email trong dữ liệu lịch public được che. OTP sống 180 giây, cooldown resend 60 giây, tối đa 5 lần nhập sai và 3 lần resend.

| Method/path | Request body/query | Thành công |
| --- | --- | --- |
| `GET /user/meetings` | Query: `dateFrom`, `dateTo`, `roomId`, `department`, `search`, `page`, `limit` | 200; `data: { items, pagination }`, sort ngày/giờ tăng dần |
| `POST /user/meetings/booking-requests` | `{ title, roomId, date, start, durationMinutes, attendees, organizer, email, department }` | 202; `Mã OTP đã được gửi đến email của bạn.`; data: `requestId`, `email`, `expiresInSeconds`, `resendAfterSeconds` |
| `POST /user/meetings/booking-requests/verify-otp` | `{ requestId, code }` | 201; `Đặt phòng họp thành công.`; `data` là booking mới, email được che |
| `POST /user/meetings/booking-requests/resend-otp` | `{ requestId }` | 200; data có thời gian OTP/cooldown |
| `POST /user/meetings/cancel-requests` | `{ bookingId }` | 202; OTP gửi tới email trong MongoDB; data có email đã che và thời gian OTP/cooldown |
| `POST /user/meetings/cancel-requests/verify-otp` | `{ bookingId, code }` | 200; `Đã hủy lịch họp.`; `data` là booking vừa hard-delete, email được che |
| `POST /user/meetings/cancel-requests/resend-otp` | `{ bookingId }` | 200; data có thời gian OTP/cooldown |

Meeting rate limit mặc định 10 start/resend và 30 verify mỗi IP trong 15 phút; cấu hình qua `MEETING_OTP_RATE_LIMIT_MAX`, `MEETING_VERIFY_RATE_LIMIT_MAX`. OTP cần `OTP_SECRET`; email cần `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

## Cookie phiên

Login set access `asia_admin_token`; khi có `rememberMe`, set refresh `asia_admin_refresh_token`, nếu không thì clear refresh. Refresh đọc refresh cookie và set lại access cookie; logout clear cả hai ([auth.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/auth.controller.ts:29)). Cookie có `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` theo `AUTH_COOKIE_SECURE`; access persistent 10 giờ, refresh 3 ngày ([auth.config.ts](/D:/Vscode/Asia-Portal/backend/src/config/auth.config.ts:3)).
