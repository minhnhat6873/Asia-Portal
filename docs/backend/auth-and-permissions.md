# Xác thực, phân quyền và OTP

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/src/config/auth.config.ts`, `backend/src/config/security.config.ts`, `backend/src/routes/index.route.ts`, `backend/src/routes/admin/auth.route.ts`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/services/admin/auth.service.ts`, `backend/src/services/user/*otp.service.ts`, `backend/src/models/*otp.model.ts`.

## JWT và cookie

- Access JWT có `sub` account ID, `tokenType: "access"`, hết hạn 10 giờ; refresh có `tokenType: "refresh"`, hết hạn 3 ngày ([auth.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/admin/auth.service.ts:25)). Cả hai ký bằng `JWT_SECRET`.
- Login chỉ tạo refresh khi `rememberMe`; controller set token vào cookie httpOnly, `sameSite: lax`, `secure` theo biến môi trường. Chi tiết set/clear tại [auth.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/auth.controller.ts:35).
- `requireAdminAuth` chỉ đọc access cookie, từ chối refresh token/ID sai, nạp lại account active và quyền vào `request.admin` ([auth.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/auth.middleware.ts:23)).

## Role và permission

| Thành phần | Cách hoạt động |
| --- | --- |
| Role | `admin`, `manager`, `user`; account `user` không vào admin. |
| Admin | Có toàn bộ `PERMISSION_ACTIONS` bất kể nhóm quyền. |
| Manager | Quyền là hợp các `actions` của nhóm quyền active được gán. |
| `requireAdminRole` | Được route dùng cho audit log, account, permission group; hiện yêu cầu `admin`. |
| `requirePermissions` | Tất cả quyền truyền vào phải có; dashboard và employee dùng middleware này. |
| Update employee | Nếu body có `status: "inactive"`, yêu cầu `employees:deactivate`; còn lại `employees:update`. |
| Media | Xem/tạo/xóa cần lần lượt `media:view`, `media:create`, `media:delete`. PATCH đổi `status` cần `media:publish`; PATCH nội dung khác cần `media:update`. |

Tập quyền hiện gồm `dashboard:view`, `employees:view/create/update/deactivate/delete` và `media:view/create/update/publish/delete` tại [permission-group.interface.ts](/D:/Vscode/Asia-Portal/backend/src/interfaces/permission-group.interface.ts:1). Cổng admin và limiter theo account được mount tại [index.route.ts](/D:/Vscode/Asia-Portal/backend/src/routes/index.route.ts:20).

## OTP đăng ký và đặt lại mật khẩu

- Cả hai dùng mã ngẫu nhiên 6 số, HMAC-SHA256 với `OTP_SECRET`, hạn 3 phút, tối đa 5 lần sai, cooldown gửi lại 60 giây và tối đa 3 lần resend ([registration-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/registration-otp.service.ts:13), [password-reset-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/password-reset-otp.service.ts:13)).
- DB chỉ lưu hash OTP (`select: false`); document có TTL index tại `otpExpiresAt` ([password-reset-otp.model.ts](/D:/Vscode/Asia-Portal/backend/src/models/password-reset-otp.model.ts:7)). Service vẫn chủ động kiểm tra hạn và xóa bản ghi hết hạn.
- Đăng ký lưu mật khẩu bcrypt hash trong pending registration, gửi email rồi xác nhận để tạo account `user/pending`; nếu gửi email thất bại service cố xóa pending tương ứng ([registration-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/registration-otp.service.ts:48)).
- Đặt lại mật khẩu chỉ cập nhật password sau khi OTP khớp, rồi xóa OTP ([password-reset-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/password-reset-otp.service.ts:101)). SMTP lỗi được map 503 bởi `emailService`.

## Bảo mật/rate limit liên quan

Whitelist CORS bỏ `*`, cho request không có `Origin`; Helmet, body limit 1 MB và mongo sanitize `body`/`params` nằm ở [index.ts](/D:/Vscode/Asia-Portal/backend/index.ts:26). Login/register dùng 5 lần/15 phút theo IP (theo cấu hình), refresh 60; API public 300, admin đã xác thực 600 theo account ([security.config.ts](/D:/Vscode/Asia-Portal/backend/src/config/security.config.ts:20)).
