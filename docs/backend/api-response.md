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
- Media có thêm `expiryDate: ISO date | null`, `publishIndefinitely: boolean` và `isExpired: boolean` (chỉ đọc). Ngày hết hạn phải sau ngày đăng theo ngày lịch, không chấp nhận cùng ngày. FormData gửi `expiryDate` rỗng để bỏ ngày hết hạn; PATCH bỏ qua trường này sẽ giữ nguyên giá trị cũ. Backend kiểm tra cả cặp ngày sau khi ghép thay đổi PATCH với dữ liệu đang lưu.
- Bài còn hạn đến hết ngày hết hạn đã chọn theo giờ Việt Nam; ví dụ chọn 20/10 thì đến 00:00 ngày 21/10 mới hết hạn. API public chỉ trả bài published chưa hết hạn, bài không có ngày hết hạn (dữ liệu cũ), hoặc bài có `publishIndefinitely: true`. Bài vĩnh viễn đã hết hạn vẫn trả `isExpired: true` để hiện nhãn “Tin đã hết hạn”. Danh sách, tìm kiếm, tổng số và truy cập trực tiếp cùng áp dụng quy tắc này. Admin luôn xem được bài hết hạn; hết hạn không đổi status, không xóa bài và không dọn ảnh.
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

Payload tài khoản xác thực từ login/refresh và GET `/admin/auth/me` gồm `id`, `name`, `email`, `phone` (nếu có), `status`, `role`, `permissions`. Phone/status lấy từ account hiện tại trong MongoDB, không lấy từ JWT. Response không có password hoặc phoneKey. Trang Tài khoản của tôi hiển thị họ tên, email, số điện thoại và trạng thái này; loại tài khoản dùng nhãn Admin gốc/Quản lý. Không hiển thị mã tài khoản, phòng ban hay danh sách quyền hạn.

Login set access `asia_admin_token`; khi có `rememberMe`, set refresh `asia_admin_refresh_token`, nếu không thì clear refresh. Refresh đọc refresh cookie và set lại access cookie; logout clear cả hai ([auth.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/auth.controller.ts:29)). Cookie có `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` theo `AUTH_COOKIE_SECURE`; access persistent 10 giờ, refresh 3 ngày ([auth.config.ts](/D:/Vscode/Asia-Portal/backend/src/config/auth.config.ts:3)).

Hợp đồng Admin Meeting (ID gốc, source/status, thống kê và OTP metadata): [admin-meetings.md](admin-meetings.md).

## Phân quyền quản trị

GET /admin/permission-groups/catalog trả `{ success: true, data: { modules, permissions } }`. Mỗi quyền gồm id (mã action), code, name, description, module, riskLevel. Group response gồm id, name, description, color, icon, actions, status, createdAt, updatedAt; description mặc định chuỗi rỗng với bản ghi cũ. Account response không có password, có phone và toàn bộ permissionGroupIds.

POST/PATCH nhóm quyền nhận `color` (`emerald`, `blue`, `purple`, `orange`, `rose`, `pink`, `slate`) và `icon` (`shield`, `users`, `calendar`, `image`, `files`, `briefcase`, `settings`, `cloud`, `crown`, `user`). Dữ liệu lưu trong MongoDB; giá trị khác bị từ chối 400. Nhóm mới và response của nhóm cũ chưa có giá trị dùng `emerald`/`shield`. PATCH không gửi color/icon sẽ giữ nguyên hai trường này.

DELETE `/admin/permission-groups/:id` chỉ dành cho admin, trả `{ success: true, message: "Đã xóa nhóm quyền.", data: { id } }`. Xóa vĩnh viễn nhóm, dùng `$pull` gỡ ID nhóm khỏi các tài khoản; tài khoản và các nhóm khác được giữ. Quyền từ nhóm mất hiệu lực ở lần xác thực tiếp theo, không tin quyền cache trong JWT. ID sai trả 400; nhóm không tồn tại trả 404 (vẫn dọn tham chiếu cũ nếu có). Ghi audit action `permission_group.deleted`, entityType `permission_group`. UI yêu cầu xác nhận trước khi gọi DELETE và giữ hộp xác nhận khi API lỗi.

Employee response admin không có trường birthDate khi người gọi thiếu employees:view-birth-date, áp dụng cho mọi endpoint đọc và ghi. Chuyển thùng rác cần employees:delete; quản lý thùng rác (xem/khôi phục/xóa vĩnh viễn) cần employees:trash.

### Tạo tài khoản quản trị

POST `/admin/accounts` yêu cầu name (họ tên 2–100 ký tự, không có số), email đúng định dạng thuộc `@asiafnb.com`, phone, password (8–100 ký tự) và confirmPassword khớp password. Số điện thoại di động Việt Nam có 10 chữ số, đầu 03/05/07/08/09; chấp nhận +84 và dấu phân cách khoảng trắng, chấm, gạch nối rồi chuẩn hóa về đầu 0. Email được trim và chuyển chữ thường. confirmPassword được kiểm tra rồi loại bỏ trước service/repository; không lưu hoặc trả lại mật khẩu/xác nhận. Lỗi trả HTTP 400 với danh sách errors bằng tiếng Việt.

`role` nhận `admin` (Admin gốc) hoặc `manager` (Quản lý), mặc định `manager`; role `user` vẫn có thể tồn tại trong dữ liệu cũ nhưng không được chọn khi tạo mới. Chỉ Admin gốc đang hoạt động được tạo/đổi loại tài khoản. Chọn `admin` tự có toàn bộ quyền và luôn lưu `permissionGroupIds: []`, kể cả body gửi nhóm quyền. PATCH đổi sang manager có thể gửi nhóm quyền mới; nếu không có nhóm thì tài khoản không có quyền từ nhóm.

Email và số điện thoại phải chưa được tài khoản nào sử dụng, kể cả tài khoản pending/inactive. Trùng trả 409, gồm `fieldErrors: { email?: string, phone?: string }`; kiểm tra cả hai trường trước khi ghi. Phone đầu +84/0 và số có dấu phân cách được coi là một số, kể cả bản ghi cũ. Backend luôn kiểm tra lại khi POST tạo; unique index email và `phoneKey` chống hai yêu cầu đồng thời. `phoneKey` là trường nội bộ select:false, chỉ gán cho số mới/thay đổi, có unique partial index trên giá trị string. Bản ghi cũ và dữ liệu trùng cũ được giữ nguyên, không chạy xóa/gộp dữ liệu; tạo mới vẫn tra cứu cả phone của bản ghi cũ. Khi đăng ký qua OTP, kiểm tra contact ở cả bước bắt đầu và xác minh.

POST `/admin/accounts/check-contacts` chỉ dành cho admin, nhận `{ email?, phone? }` (ít nhất một trường, cùng định dạng như khi tạo), trả `{ success: true, data: { emailAvailable?, phoneAvailable? } }`; chỉ trả boolean, không trả thông tin tài khoản trùng. Form gọi khi rời ô email/điện thoại để báo lỗi cạnh ô nhập. Kết quả kiểm tra sớm không thay thế kiểm tra/unique index khi lưu; response cũ sau khi đổi giá trị sẽ bị bỏ qua. Khi POST tạo trả lỗi trùng, form hiển thị fieldErrors và giữ dữ liệu để sửa.

### Xóa tài khoản

DELETE `/admin/accounts/:id` chỉ dành cho Admin gốc, trả `{ success: true, message: "Đã xóa tài khoản.", data: { id } }`. Xóa vĩnh viễn document tài khoản khỏi MongoDB; không có thùng rác tài khoản. Admin gốc được xóa tài khoản Admin gốc khác. Chặn tự xóa (400), xóa Admin gốc đang hoạt động cuối cùng (400), ID sai (400), tài khoản không tồn tại (404); nếu tài khoản thay đổi/xóa đồng thời trả 409. Phiên access/refresh của tài khoản đã xóa bị từ chối ở lần xác thực tiếp theo vì luôn nạp lại account từ DB. Lịch sử/nội dung do tài khoản tạo được giữ; ghi audit action `account.deleted`, entityType `account`. UI chỉ gửi DELETE sau khi xác nhận, giữ hộp xác nhận khi lỗi và tải lại danh sách/số lượng sau thành công.

### Bảo vệ quyền Admin gốc

Các Admin gốc ngang quyền: được sửa, đổi loại, khóa/mở, xóa và đặt lại mật khẩu của tài khoản Admin gốc khác. Quản lý dù được cấp đủ 16 quyền vẫn bị chặn mọi API quản lý tài khoản/nhóm bởi role gate. PATCH tài khoản không cho tự hạ loại hoặc tự khóa; DELETE không cho tự xóa. Luôn giữ ít nhất một account `role: admin`, `status: active`. Tự đổi mật khẩu phải xác minh mật khẩu hiện tại, gửi OTP email rồi xác nhận qua PATCH `/admin/auth/password`; endpoint quản trị PATCH `/admin/accounts/:id/password` chỉ dành cho tài khoản khác.

Tạo/sửa/xóa/đặt lại mật khẩu dùng transaction với khóa ghi chung trong collection `accountadministrationlocks`. Sau khi nhận khóa, nạp lại actor active từ DB và bắt buộc role admin; request đã vào trước lúc bị hạ quyền/khóa/xóa cũng bị từ chối khi tới lượt. Đếm Admin active và thay đổi tài khoản trong cùng transaction, ngăn hai Admin đồng thời hạ quyền/khóa/xóa nhau làm hệ thống mất toàn bộ Admin. MongoDB cần hỗ trợ transaction; không có đường ghi dự phòng bỏ qua kiểm tra này. Cơ chế dựa trên [transaction của Mongoose](https://mongoosejs.com/docs/transactions.html).

## OTP email khi tự đổi mật khẩu

- POST `/admin/auth/password/request-otp`: body `{ currentPassword, newPassword }`, cần cookie đăng nhập (Admin gốc/Quản lý). Trả 202 `{ success: true, message, data: { requestId, email, expiresInSeconds, resendAfterSeconds } }`; email lấy từ MongoDB. Bước này chưa đổi mật khẩu.
- POST `/admin/auth/password/resend-otp`: body `{ requestId }`, trả 200 với metadata như trên; mã trước mất hiệu lực sau gửi lại thành công.
- PATCH `/admin/auth/password`: body `{ requestId, code }`, requestId là UUID, code là chuỗi 6 chữ số. Chỉ trả 200 `{ success: true, message }` sau khi dùng OTP và cập nhật mật khẩu trong cùng transaction. Không nhận mật khẩu mới tại bước này; dùng hash gắn với yêu cầu lúc gửi mã.
- API không trả OTP, hash OTP hay hash password. Payload PATCH cũ `{ currentPassword, newPassword }` trả 400. Sai mật khẩu/mã, mã hết hạn/đã dùng hoặc yêu cầu không thuộc tài khoản trả 400; vượt số lần thử/gửi lại/cooldown hoặc rate limit trả 429; trạng thái/email/password thay đổi giữa hai bước trả 409; SMTP lỗi trả 503.
- Mã hết hạn sau 180 giây, tối đa 5 lần sai mỗi yêu cầu, chờ 60 giây trước gửi lại, tối đa 3 lần gửi lại. Limiter theo account cho request/resend chung 10 lượt, confirm 30 lượt trong cửa sổ cấu hình (mặc định 15 phút).

## OTP email khi đổi địa chỉ email

| Endpoint | Body | Thành công |
| --- | --- | --- |
| POST `/admin/auth/email/request-otp` | `{ newEmail }` | 202 `{ success: true, message, data: { requestId, email, expiresInSeconds, resendAfterSeconds } }`; email là địa chỉ mới nhận OTP. |
| POST `/admin/auth/email/resend-otp` | `{ requestId }` | 200 cùng cấu trúc metadata; mã cũ hết hiệu lực sau gửi lại thành công. |
| PATCH `/admin/auth/email` | `{ requestId, code }` | 200 `{ success: true, message, data: { email } }`; email mới đã được lưu. |

Cả ba cần cookie đăng nhập, cho Admin gốc/Quản lý đổi email của mình. Không nhận account ID hay email đích ở bước confirm; email được gắn với yêu cầu. Payload PATCH chỉ newEmail không thể đổi trực tiếp. NewEmail bắt buộc đúng định dạng và đuôi @asiafnb.com, chuẩn hóa trim/lowercase theo schema tạo tài khoản; giữ OTP, kiểm tra trùng và giới hạn an toàn. API không trả OTP hay hash.

HTTP 400: email không hợp lệ/không đổi, UUID/code sai, OTP sai/hết hạn/đã dùng hoặc không thuộc chủ tài khoản; 401/403: chưa đăng nhập hoặc tài khoản không đủ điều kiện; 409: email đã có chủ (kể cả race khi confirm), tài khoản/email/password thay đổi; 429: cooldown, số lần sai/gửi lại/rate limit; 503: gửi SMTP thất bại. OTP có hạn 180 giây, tối đa 5 lần sai/yêu cầu, gửi lại sau 60 giây và tối đa 3 lần.

Validation đổi email từ chối body thiếu/null/sai kiểu, email không phải chuỗi, phần trước @ quá 64 ký tự, dữ liệu lồng dạng object/array, UUID không hợp lệ và OTP không phải chuỗi đúng 6 chữ số ASCII. Giao diện kiểm tra email rỗng/độ dài/định dạng trước khi gửi và hiển thị danh sách errors cụ thể từ API bằng tiếng Việt.
