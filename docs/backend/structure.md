# Cấu trúc backend

Cập nhật lần cuối: 2026-10-19. File nguồn đã đọc: `backend/index.ts`, `backend/src/config/**`, `backend/src/routes/**`, `backend/src/middlewares/**`, `backend/src/controllers/**`, `backend/src/services/**`, `backend/src/repositories/**`, `backend/src/models/**`, `backend/src/interfaces/**`, `backend/src/validates/**`, `backend/src/helpers/**`, `backend/src/utils/**`, `backend/src/types/**`, `backend/scripts/**`, `backend/tests/**`.

| Vị trí | Vai trò |
| --- | --- |
| `index.ts` | Tạo Express app, bảo mật toàn cục, mount route, 404/error, kết nối DB. |
| `src/config/` | Cookie auth, MongoDB, CORS/rate-limit/trust proxy. |
| `src/routes/` | Khai báo endpoint, thứ tự middleware và mount public/admin. |
| `src/middlewares/` | Xác thực/quyền, Joi, upload có dọn file lỗi, error mapping. |
| `src/controllers/{admin,user}` | Nhận HTTP, gọi service, trả JSON; admin employee ghi audit. |
| `src/services/{admin,user,notification}` | Nghiệp vụ, mapping response, OTP/email, phân trang. |
| `src/services/account-contact.service.ts` | Kiểm tra email/số điện thoại tồn tại, dùng chung cho tạo tài khoản và service OTP đăng ký. |
| `src/repositories/admin/account-administration.repository.ts`, `src/models/account-administration-lock.model.ts` | Transaction và khóa ghi chung cho thay đổi tài khoản, bảo vệ Admin gốc đang hoạt động cuối cùng. |
| `src/interfaces/password-change-otp.interface.ts`, `src/models/password-change-otp.model.ts` | Yêu cầu đổi mật khẩu riêng, hash OTP/password ẩn, TTL hết hạn. |
| `src/services/admin/password-change-otp.service.ts`, `src/repositories/admin/password-change-otp.repository.ts` | Kiểm tra mật khẩu hiện tại, gửi/gửi lại OTP email, giới hạn thử và transaction xác nhận một lần. |
| `src/interfaces/email-change-otp.interface.ts`, `src/models/email-change-otp.model.ts` | Yêu cầu đổi email gắn với chủ tài khoản, email hiện tại/email mới, hash OTP/password ẩn và TTL. |
| `src/services/admin/email-change-otp.service.ts`, `src/repositories/admin/email-change-otp.repository.ts` | Kiểm tra email trùng, OTP gửi đến email mới, giới hạn thử/gửi lại và transaction đổi email một lần. |
| `src/utils/account/normalizeContact.ts` | Chuẩn hóa số điện thoại và đối chiếu số có định dạng cũ. |
| `src/repositories/{admin,user}` | Lớp Mongoose; user repository lọc trường riêng tư. |
| `src/models/` | Schema/collection/index/hook Mongoose. |
| `src/jobs/` | Tác vụ nền dọn nội dung, tự chuyển lịch họp đã kết thúc và gửi email nhắc trước giờ họp 30 phút. |
| `src/interfaces/` | Kiểu domain, input/output, hằng enum-like. |
| `src/validates/admin/` | Joi body/query schema. |
| `src/helpers/`, `src/utils/`, `src/types/` | Cloudinary/Multer, `AppError`/escape regex, mở rộng `Request.admin`. |
| `scripts/` | Tạo admin ban đầu, upsert dữ liệu nhân viên và nạp lịch họp mẫu bằng `yarn seed:meetings`. |
| `tests/` | Unit test service/validate/middleware bằng Jest mock. |

## Luồng và biên lớp

`route → middleware → controller → service → repository → model`. Route chỉ điều phối; controller không chứa truy vấn DB; service không trả `Response`; repository không chứa chính sách nghiệp vụ. Service được phép gọi service hỗ trợ (`emailService`, `auditLogService`) và helper; middleware auth là ngoại lệ đọc repository để nạp phiên.

`admin` và `user` được tách xuyên suốt ở route/controller/service/repository. `userEmployeeRepository` loại bỏ bốn trường nhạy cảm tại [backend/src/repositories/user/employee.repository.ts](/D:/Vscode/Asia-Portal/backend/src/repositories/user/employee.repository.ts:14), trong khi admin nhận bản ghi đầy đủ.

## Thứ tự toàn cục và mount router

Theo [backend/index.ts](/D:/Vscode/Asia-Portal/backend/index.ts:21): tắt `x-powered-by` → (tùy cấu hình) trust proxy → Helmet → CORS credentials/whitelist → rate limit public (bỏ qua `/health`, `/admin/*`) → JSON/urlencoded 1 MB → cookie parser → mongo sanitize `body`/`params` → routes → 404 → `globalErrorHandler`.

Theo [backend/src/routes/index.route.ts](/D:/Vscode/Asia-Portal/backend/src/routes/index.route.ts:32): `/health`, `/user/employees`, `/admin/auth` được mount trước; mọi `/admin` còn lại đi qua `requireAdminAuth` và limiter theo `request.admin.id`; audit/account/permission group còn yêu cầu role `admin`. Permission chi tiết cho dashboard/employee nằm ở router con.

## Quy ước đặt tên

- Phân tầng hậu tố: `*.route.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.model.ts`, `*.interface.ts`, `*.validate.ts`.
- Module admin/user theo thư mục; export object như `adminEmployeeService`, `adminEmployeeRepository`, `userEmployeeService`.
- Controller là hàm named export; model default export. Hằng giá trị hữu hạn dùng `as const`, ví dụ `EMPLOYEE_STATUSES` tại [backend/src/interfaces/employee.interface.ts](/D:/Vscode/Asia-Portal/backend/src/interfaces/employee.interface.ts:1).

