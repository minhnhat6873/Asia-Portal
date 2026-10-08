# Kiến trúc backend Asia Portal

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/index.ts`, `backend/src/config/**`, `backend/src/routes/**`, `backend/src/middlewares/**`, `backend/src/controllers/**`, `backend/src/services/**`, `backend/src/repositories/**`, `backend/src/models/**`.

Backend dùng Express 5 + TypeScript strict, MongoDB/Mongoose, JWT trong cookie httpOnly. Hai bề mặt API là danh bạ công khai `/user/employees` và quản trị `/admin/*`.

```text
HTTP
  → index.ts: helmet, CORS, rate limit, body parser, cookie parser, sanitize
  → routes: mount /health, /user, /admin/auth hoặc cổng /admin
  → middleware route: auth / role / permission / limiter / upload / Joi
  → controller: HTTP response, next(error), audit cho thao tác nhân viên
  → service: nghiệp vụ, phân trang, kiểm tra ID/quy tắc
  → repository: truy vấn Mongoose
  → model/schema → MongoDB
```

Quan hệ gọi chuẩn là route gọi middleware/controller; controller gọi service; service gọi repository, helper hoặc service thông báo; repository gọi model. Ngoại lệ có chủ đích: `auth.middleware.ts` gọi repository để dựng `request.admin`; controller nhân viên gọi thêm `auditLogService` sau thao tác. Không thấy controller gọi model trực tiếp.

Khởi động tại [backend/index.ts](/D:/Vscode/Asia-Portal/backend/index.ts:18): kết nối database trước `listen`. Cấu hình database cho phép server dev chạy khi thiếu `DATABASE`, nhưng các thao tác cần MongoDB vẫn phụ thuộc kết nối thực tế.

Chi tiết cấu trúc, chuẩn code, response, endpoint, auth và rủi ro nằm lần lượt trong `docs/backend/`.

