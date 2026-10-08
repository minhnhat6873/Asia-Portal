# Asia Portal — Hướng dẫn làm việc

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/package.json`, `backend/index.ts`, `backend/src/**`, `backend/scripts/**`, `backend/tests/**`.

## Mục đích

Backend TypeScript/Express/MongoDB cho cổng thông tin Asia: danh bạ nhân viên công khai và khu vực quản trị nhân sự, tài khoản, nhóm quyền, audit log, OTP.

## Chạy backend

- `cd backend && yarn install && yarn dev` — chạy phát triển, cổng mặc định 4000.
- `yarn build && yarn start` — biên dịch rồi chạy bản `dist`.
- `yarn test` — Jest/ts-jest; `yarn seed:admin`, `yarn seed:employees` — seed có chủ đích.
- Sao chép/cấu hình biến từ `backend/.env.example`; không commit `.env` hay secret.

## Quy tắc bất biến

- Luồng chính: route → middleware → controller → service → repository → model; không để controller truy vấn Mongoose trực tiếp.
- Giữ TypeScript `strict`, `import type`, object service/repository export có tên và Joi validate trước controller.
- API dùng `{ success, message?, data? }`; lỗi nghiệp vụ ném `AppError`, controller chuyển qua `next(error)`.
- API `/user/*` chỉ trả dữ liệu công khai; không làm rò `birthDate`, `gender`, `createdBy`, `avatarPublicId`.
- `/admin/*` (trừ `/admin/auth`) phải qua `requireAdminAuth`; thêm role/permission ngay tại route khi cần.
- Nhân viên dùng soft delete trước; chỉ xóa vĩnh viễn từ thùng rác và dọn ảnh Cloudinary tương ứng.
- Khi thêm trường/endpoint, cập nhật validate, interface, test và tài liệu liên quan trong `docs/backend/`.

## Bảng điều hướng

| Khi làm việc gì | Đọc trước |
| --- | --- |
| Hiểu luồng/lớp/cấu trúc | `ARCHITECTURE.md`, `docs/backend/structure.md` |
| Viết code đúng chuẩn | `docs/backend/coding-conventions.md`, `backend/tsconfig.json` |
| Thêm/sửa API | `docs/backend/endpoints.md`, `docs/backend/api-response.md` |
| Đăng nhập, cookie, OTP, quyền | `docs/backend/auth-and-permissions.md` |
| Thêm một tính năng | `docs/backend/how-to-add-feature.md` |
| Đánh giá nợ kỹ thuật/rủi ro | `docs/backend/known-issues.md` |
| Chạy/seed/cấu hình | `backend/package.json`, `backend/.env.example`, `backend/scripts/` |

