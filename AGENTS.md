# Asia Portal — Hướng dẫn làm việc

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/package.json`, `backend/index.ts`, `backend/src/**`, `backend/scripts/**`, `backend/tests/**`.

## Mục đích

Backend TypeScript/Express/MongoDB cho cổng thông tin Asia: danh bạ nhân viên công khai và khu vực quản trị nhân sự, tài khoản, nhóm quyền, audit log, OTP.

## Chạy backend

- `cd backend && yarn install && yarn dev` — chạy phát triển, cổng mặc định 4000.
- `yarn build && yarn start` — biên dịch rồi chạy bản `dist`.
- `yarn test:integration` — test trên MongoDB thật, cần `TEST_DATABASE` có tên kết thúc bằng `_test`; CI tự bật MongoDB tạm.
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

Tra cứu mã từ thư mục gốc của repo:

- Để xem hàm nào gọi nhau, dùng tên hàm cụ thể, ví dụ `graphify query "getPublicEmployees" --context call`. `.graphifyrc` mặc định tra một bước với ngân sách 500 token. Nếu thiếu kết quả, bỏ `--context call` để xem các liên kết khác hoặc dùng `rg` theo tên hàm. Chỉ tăng `--depth` khi cần lần thêm bước.
- Khi đã biết chuỗi HTTP, dùng `rg -n -F` trong frontend service và backend route. Express có thể ghép tiền tố trong `index.route.ts` với đường dẫn ở router con. Mở đoạn mã liên quan để xác minh.
- Chạy `graphify update .` khi chưa có chỉ mục hoặc phần mã đang tra đã đổi. Với các lần tra thông thường, dùng chỉ mục hiện có trong `graphify-out/`.

Frontend dùng Next.js App Router. Bắt đầu từ `frontend/src/app` để tìm trang, theo import sang `features` để xem giao diện và sang `services` để xem lời gọi API. Alias `@/` trỏ tới `frontend/src/`. Kiểu dữ liệu dùng chung nằm trong `types`, còn thành phần giao diện dùng chung nằm trong `components`.

Để nối hai đầu HTTP, lấy đường dẫn trong frontend service rồi đối chiếu với `backend/src/routes/index.route.ts` và router con. Ví dụ trang `/employees` dùng `EmployeesPage` → `getPublicEmployees` → `apiGet`. Trình duyệt gửi `GET /backend-api/user/employees`; rewrite trong `frontend/next.config.ts` chuyển thành `GET /user/employees` ở Express. Theo `routes/user/employee.route.ts` đến controller, service và repository cùng tên miền nghiệp vụ trong `backend/src`; frontend service đổi `_id` thành `id` cho giao diện.

Khi sửa luồng quản trị, bắt đầu từ `frontend/src/proxy.ts` cho chuyển hướng trang và `frontend/src/services/api.ts` cho gửi cookie, xử lý lỗi và làm mới phiên. Kiểm tra middleware xác thực và quyền ở router Express tương ứng.

| Khi làm việc gì | Đọc trước |
| --- | --- |
| Hiểu luồng/lớp/cấu trúc | `ARCHITECTURE.md`, `docs/backend/structure.md` |
| Viết code đúng chuẩn | `docs/backend/coding-conventions.md`, `backend/tsconfig.json` |
| Thêm/sửa API | `docs/backend/endpoints.md`, `docs/backend/api-response.md` |
| Đăng nhập, cookie, OTP, quyền | `docs/backend/auth-and-permissions.md` |
| Thêm một tính năng | `docs/backend/how-to-add-feature.md` |
| Đánh giá nợ kỹ thuật/rủi ro | `docs/backend/known-issues.md` |
| Chạy/seed/cấu hình | `backend/package.json`, `backend/.env.example`, `backend/scripts/` |

