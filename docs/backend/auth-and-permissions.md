# Xác thực, phân quyền và OTP

Cập nhật lần cuối: 2026-10-19. File nguồn đã đọc: `backend/src/config/auth.config.ts`, `backend/src/config/security.config.ts`, `backend/src/routes/index.route.ts`, `backend/src/routes/admin/auth.route.ts`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/services/admin/auth.service.ts`, `backend/src/services/user/*otp.service.ts`, `backend/src/models/*otp.model.ts`.

## JWT và cookie

- Access JWT có `sub` account ID, `tokenType: "access"`, hết hạn 10 giờ; refresh có `tokenType: "refresh"`, hết hạn 3 ngày ([auth.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/admin/auth.service.ts:25)). Cả hai ký bằng `JWT_SECRET`.
- Login chỉ tạo refresh khi `rememberMe`; controller set token vào cookie httpOnly, `sameSite: lax`, `secure` theo biến môi trường. Chi tiết set/clear tại [auth.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/auth.controller.ts:35).
- `requireAdminAuth` chỉ đọc access cookie, từ chối refresh token/ID sai, nạp lại account active và quyền vào `request.admin` ([auth.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/auth.middleware.ts:23)).

## Role và permission

| Thành phần | Cách hoạt động |
| --- | --- |
| Role | `admin`, `manager`, `user`; account `user` không vào admin. |
| Admin gốc | Account có role `admin`, có toàn bộ `PERMISSION_ACTIONS` bất kể nhóm quyền. Các Admin gốc ngang quyền và quản lý được tài khoản của nhau. |
| Manager | Quyền là hợp các `actions` của nhóm quyền active được gán. |
| `requireAdminRole` | Được route dùng cho audit log, account, permission group; hiện yêu cầu `admin`. |
| `requirePermissions` | Tất cả quyền truyền vào phải có; dashboard và employee dùng middleware này. |
| Update employee | `employees:update` bao gồm thông tin, trạng thái làm việc và ảnh sơ đồ. |
| Media | Xem/tạo/xóa cần lần lượt `media:view`, `media:create`, `media:delete`. PATCH đổi `status` cần `media:publish`; PATCH nội dung khác cần `media:update`; body gồm cả status và nội dung cần cả hai quyền. POST bài published cần thêm `media:publish`. |

Danh mục chuẩn nằm trong `backend/src/config/permission-catalog.ts`, trả qua GET `/admin/permission-groups/catalog` (admin only), gồm 16 quyền:

- Dashboard: `dashboard:view`.
- Nhân sự: `employees:view`, `employees:view-birth-date`, `employees:create`, `employees:update`, `employees:delete`, `employees:trash`.
- Truyền thông: `media:view/create/update/publish/delete`.
- Lịch họp: `meetings:view/create/update/delete`.

`employees:delete` chỉ chuyển nhân viên vào thùng rác. `employees:trash` bao gồm xem, khôi phục và xóa vĩnh viễn. Không tách quyền cho trạng thái “Đã nghỉ việc”.

Mọi response employee admin (kể cả create/update/delete/restore, list và trash) loại bỏ `birthDate` nếu thiếu `employees:view-birth-date`. API public tiếp tục không trả ngày sinh với bất kỳ tài khoản nào.

Mỗi request nạp account và các nhóm active từ MongoDB, hợp nhất quyền và loại mã quyền cũ/không hợp lệ; không tin role/actions từ JWT hoặc localStorage. Thay đổi nhóm, gán nhóm và khóa tài khoản có hiệu lực ngay ở request tiếp theo. Nhóm cũ không tự nhận quyền xem ngày sinh/quản lý thùng rác mới; admin cần chọn và lưu nếu muốn cấp.

Frontend tạo/gán/sửa/vô hiệu hóa nhóm qua API, chỉ thông báo thành công sau khi lưu; hỗ trợ nhiều nhóm mỗi tài khoản. Không còn tài khoản, nhóm hay thùng rác giả lưu trong trình duyệt. Chỉ metadata phiên được cache cho UI; route được xác minh bằng /auth/me trước khi hiển thị, khi focus và mỗi 60 giây.

## Đổi mật khẩu khi đã đăng nhập

Áp dụng cho cả Admin gốc và Quản lý. POST `/admin/auth/password/request-otp` nhận `{ currentPassword, newPassword }`, xác minh mật khẩu hiện tại bằng bcrypt; mật khẩu mới 8–100 ký tự và khác hiện tại. Chưa cập nhật password ở bước này. OTP chỉ gửi đến email lấy từ tài khoản hiện tại trong MongoDB, không nhận email đích từ client.

Client nhận `{ requestId, email, expiresInSeconds, resendAfterSeconds }` và hiển thị ô nhập OTP. PATCH `/admin/auth/password` bắt buộc `{ requestId, code }` (UUID và 6 chữ số); payload đổi trực tiếp cũ bị từ chối. Không lưu mật khẩu/OTP trong localStorage; sau khi gửi mã thành công, giao diện xóa các ô mật khẩu khỏi state.

Mã ngẫu nhiên 6 số được HMAC-SHA256 bằng OTP_SECRET với mục đích, account ID và request ID; bản ghi riêng lưu hash OTP, hash bcrypt của mật khẩu mới và hash mật khẩu hiện tại, cả ba đều select:false. TTL dọn bản ghi và service vẫn kiểm tra hạn 3 phút. Sai tối đa 5 lần cho mỗi yêu cầu, kể cả sau gửi lại; bộ đếm cập nhật nguyên tử. POST `/admin/auth/password/resend-otp` nhận `{ requestId }`, chờ 60 giây, tối đa 3 lần; gửi lại tạo mã mới và vô hiệu mã trước. Yêu cầu mới thay thế yêu cầu cũ, cũng chịu cooldown 60 giây.

Xác nhận dùng transaction để xóa OTP một lần và cập nhật password có điều kiện: tài khoản vẫn active/admin hoặc manager, email và hash password cũ chưa thay đổi. OTP của tài khoản khác, hết hạn, đã dùng hoặc đã bị thay thế đều bị chặn; hai xác nhận đồng thời chỉ một lần thành công. Nếu tài khoản/password thay đổi, transaction rollback và yêu cầu nhập lại mật khẩu. Lỗi SMTP trả 503; gửi lần đầu thất bại xóa đúng yêu cầu, gửi lại thất bại khôi phục mã trước nếu chưa có yêu cầu mới thay thế.

Limiter theo account: gửi mới/gửi lại dùng chung 10 lượt trong rateLimitWindowMs; xác nhận 30 lượt trong cùng cửa sổ (mặc định 15 phút). Dùng SMTP và OTP_SECRET hiện có. Việc Admin đặt lại mật khẩu cho tài khoản khác vẫn qua API quản trị riêng theo chính sách Admin gốc.

## OTP đăng ký và đặt lại mật khẩu

- Cả hai dùng mã ngẫu nhiên 6 số, HMAC-SHA256 với `OTP_SECRET`, hạn 3 phút, tối đa 5 lần sai, cooldown gửi lại 60 giây và tối đa 3 lần resend ([registration-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/registration-otp.service.ts:13), [password-reset-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/password-reset-otp.service.ts:13)).
- DB chỉ lưu hash OTP (`select: false`); document có TTL index tại `otpExpiresAt` ([password-reset-otp.model.ts](/D:/Vscode/Asia-Portal/backend/src/models/password-reset-otp.model.ts:7)). Service vẫn chủ động kiểm tra hạn và xóa bản ghi hết hạn.
- Đăng ký lưu mật khẩu bcrypt hash trong pending registration, gửi email rồi xác nhận để tạo account `user/pending`; nếu gửi email thất bại service cố xóa pending tương ứng ([registration-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/registration-otp.service.ts:48)).
- Đặt lại mật khẩu chỉ cập nhật password sau khi OTP khớp, rồi xóa OTP ([password-reset-otp.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/user/password-reset-otp.service.ts:101)). SMTP lỗi được map 503 bởi `emailService`.

## Bảo mật/rate limit liên quan

Whitelist CORS bỏ `*`, cho request không có `Origin`; Helmet, body limit 1 MB và mongo sanitize `body`/`params` nằm ở [index.ts](/D:/Vscode/Asia-Portal/backend/index.ts:26). Login/register dùng 5 lần/15 phút theo IP (theo cấu hình), refresh 60; API public 300, admin đã xác thực 600 theo account ([security.config.ts](/D:/Vscode/Asia-Portal/backend/src/config/security.config.ts:20)).

Meeting admin bổ sung meetings:view/create/update/delete. Mọi route qua cổng requireAdminAuth; thu hồi OTP dùng meetings:delete, không xác thực OTP thay người dùng. Chi tiết tại [admin-meetings.md](admin-meetings.md).

## Giao diện quản lý nhóm quyền

Danh sách hiển thị trạng thái trực tiếp từ MongoDB: active là “Đang sử dụng”, inactive là “Đã vô hiệu hóa”, độc lập số tài khoản được gán. Nút khóa mở hộp xác nhận có Hủy và Xác nhận; chỉ gọi PATCH sau khi xác nhận. Nút bút dẫn tới `/admin/access-control/roles/[id]/edit`. Trang này nạp nhóm từ API, điền sẵn tên, mô tả và các checkbox quyền; lưu cả ba trường qua PATCH `/admin/permission-groups/:id`, giữ nguyên trạng thái hiện tại. Khi API lỗi, giữ nguyên form/hộp xác nhận để thử lại.

Trang `/admin/access-control` là trang chọn chức năng bằng ba thẻ. Quản lý tài khoản chuyển đến `/admin/access-control/accounts`; danh sách nhóm và tạo nhóm lần lượt ở `/admin/access-control/roles` và `/admin/access-control/roles/new`. Các trang con không hiển thị thanh tab; nút Phân quyền quản lý trên sidebar quay về trang chọn chức năng. Các route này tiếp tục chỉ dành cho Admin và dữ liệu các trang con được tải từ API.

Nút Thêm tài khoản dẫn đến `/admin/access-control/accounts/new`, là trang riêng trong giao diện admin. Form giữ kiểm tra email công ty, số điện thoại Việt Nam, mật khẩu/xác nhận và chỉ cho chọn nhóm active tải từ API. Lưu thành công qua POST `/admin/accounts` thì quay về danh sách đã tải lại; API lỗi giữ nguyên dữ liệu form. Mũi tên quay lại và Hủy về trang quản lý tài khoản.

Email/số điện thoại được kiểm tra trực tiếp từ MongoDB qua POST `/admin/accounts/check-contacts` (admin only) khi rời ô nhập; POST tạo luôn kiểm tra lại và unique index ngăn tạo trùng đồng thời. Kết quả chỉ có boolean khả dụng. Số +84/0 và số có khoảng trắng/chấm/gạch nối được chuẩn hóa và so khớp cả dữ liệu cũ. Lỗi 409 có fieldErrors để hiển thị tại đúng ô, không chuyển về danh sách khi thất bại. Các tài khoản đã trùng trước đó được giữ nguyên; backend chặn thêm tài khoản dùng cùng số.

Danh sách tài khoản có cột Loại tài khoản riêng: Admin gốc hoặc Quản lý. Nhấn Chỉnh sửa để chọn và lưu qua PATCH. Chỉ Admin gốc có quyền thao tác; tài khoản đang đăng nhập không có nút tự sửa loại/khóa/xóa. Admin gốc khác vẫn có nút chỉnh sửa và xóa có xác nhận. Form thêm mặc định Quản lý; chọn Admin gốc ẩn phần gán nhóm, thông báo có toàn quyền và gửi role admin. Vai trò admin được lưu ở account, không suy ra từ tên nhóm hoặc số quyền đã tích.

Backend chặn tự hạ quyền, tự khóa, tự xóa và mất Admin gốc active cuối cùng. Các thay đổi tài khoản dùng transaction và một khóa ghi chung; actor được kiểm tra lại sau khi nhận khóa để ngăn request đồng thời của người vừa bị hạ quyền. Quyền quản lý đủ 16 action không bao gồm quyền đổi loại tài khoản; cổng role admin luôn được giữ. Chi tiết contract và concurrency tại `api-response.md`.

Form tạo/chỉnh sửa có màu sắc, icon và xem trước nhãn; hai giá trị được lưu qua POST/PATCH và dùng cho nhãn ở danh sách nhóm/tài khoản. Nút thùng rác mở hộp xác nhận xóa có tên nhóm và số tài khoản đang gán. Sau xác nhận, DELETE xóa nhóm và gỡ nhóm khỏi tài khoản; tài khoản giữ nguyên, quyền từ các nhóm còn lại vẫn được hợp như trước. Quyền nhóm đã xóa bị thu hồi ở request xác thực kế tiếp.

## Đổi email khi đã đăng nhập

Admin gốc và Quản lý đều được đổi email của chính mình tại `/admin/account/change-email`, mở từ mục Đổi email trong Tài khoản của tôi. POST `/admin/auth/email/request-otp` nhận `{ newEmail }`; backend lấy chủ tài khoản từ cookie, không cho chọn account ID khác. Email mới dùng chung schema email công ty khi tạo tài khoản: trim/lowercase, đúng định dạng, tối đa 150 ký tự, đuôi chính xác @asiafnb.com. Đã bật lại giới hạn tên miền sau khi kiểm thử. Từ chối email giống hiện tại (400) hoặc đã có ở bất kỳ tài khoản/trạng thái nào (409).

OTP được gửi đến email mới. Email tài khoản vẫn giữ nguyên đến khi PATCH `/admin/auth/email` nhận đúng `{ requestId, code }`. Mã 6 số dùng HMAC-SHA256 với OTP_SECRET, mục đích email-change, chủ tài khoản, UUID yêu cầu và email đích; DB chỉ lưu hash OTP, snapshot email hiện tại và hash password (select:false). TTL và service kiểm tra hạn 3 phút. Tối đa 5 lần sai mỗi yêu cầu, giữ số lần sai khi gửi lại; cooldown 60 giây, tối đa 3 gửi lại. Limiter riêng theo account: request/resend chung 10, confirm 30 trong cửa sổ cấu hình (mặc định 15 phút).

Gửi lại tạo mã khác và vô hiệu mã trước; tạo yêu cầu mới thay thế yêu cầu trước. Lỗi SMTP gửi lần đầu xóa đúng yêu cầu, lỗi gửi lại khôi phục mã trước nếu vẫn là cùng phiên. Không trả OTP/hash trong response.

Xác nhận dùng transaction: tiêu thụ OTP một lần, kiểm tra lại email chưa bị chiếm, rồi cập nhật email có điều kiện tài khoản còn active/admin hoặc manager, email/password cũ chưa đổi. Unique index account.email chặn hai tài khoản đồng thời nhận cùng địa chỉ; lỗi trả 409 và rollback. Các trường role/status/nhóm quyền/password không bị thay đổi. Chỉ tài khoản đang đăng nhập được tác động, nên Quản lý không thể dùng API này để sửa Admin gốc.

Sau thành công, response `{ email }` cập nhật metadata phiên và thông tin tài khoản. Middleware lấy email hiện tại từ MongoDB theo JWT sub, nên cookie hiện tại tiếp tục hoạt động; lần đăng nhập sau dùng email mới và password cũ. Email cũ không còn đăng nhập được. OTP đổi mật khẩu đã phát hành cho email cũ bị snapshot check từ chối.
