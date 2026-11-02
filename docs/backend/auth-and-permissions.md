# Xác thực, phân quyền và OTP

Cập nhật lần cuối: 2026-10-19. File nguồn đã đọc: `backend/src/config/auth.config.ts`, `backend/src/config/security.config.ts`, `backend/src/routes/index.route.ts`, `backend/src/routes/admin/auth.route.ts`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/services/admin/auth.service.ts`, `backend/src/services/user/*otp.service.ts`, `backend/src/models/*otp.model.ts`.

## JWT và cookie

Mật khẩu đặt mới dùng một schema chung tại `validates/admin/password.validate.ts`: 8–32 ký tự, bắt buộc chữ hoa ASCII, chữ thường ASCII, số và ký tự đặc biệt; cấm mọi khoảng trắng (gồm space/tab/xuống dòng/NBSP), không trim hoặc tự thay ký tự. Áp dụng đăng ký, tạo tài khoản, quên mật khẩu, Admin reset, tự đổi mật khẩu và script tạo Admin đầu tiên. Frontend dùng chung `lib/password-validation.ts` và giới hạn 32 ở ô mật khẩu mới/xác nhận. Đăng nhập và xác minh mật khẩu hiện tại vẫn đối chiếu nguyên văn mật khẩu cũ (tối đa 100 ký tự) để tài khoản cũ không bị khóa bởi thay đổi chính sách; không đổi dữ liệu mật khẩu đã lưu.

- Access JWT ký HS256 bằng JWT_SECRET, chứa sub, sid (phiên), version và tokenType; hết hạn sau 15 phút. Mỗi request kiểm tra account active, phiên còn hạn/chưa bị thu hồi và authVersion khớp; role/quyền luôn lấy từ DB.
- Login luôn cấp access + refresh. Có rememberMe: cookie bền và phiên tối đa 3 ngày. Không chọn: cả hai là session cookie, phiên tối đa 10 giờ. Giữ HttpOnly, SameSite=Lax, host-only, path=/; Secure theo AUTH_COOKIE_SECURE (chỉ bật khi HTTPS đã hoạt động).
- Collection authsessions lưu ID phiên, accountId, phiên bản xác thực, hạn tuyệt đối và SHA-256 của refresh token. TTL chỉ dọn rác; logic vẫn kiểm tra expiresAt. Không trả các trường nội bộ qua API.
- Refresh dùng compare-and-swap để thay token. Các yêu cầu đồng thời trong 5 giây nhận cùng token kế tiếp, không tạo nhánh hoặc gia hạn phiên. Token trước bị dùng lại ngoài cửa sổ này làm thu hồi cả phiên. Cửa sổ 5 giây cố ý dung hòa retry/nhiều tab và phát hiện replay; không ngăn kẻ trộm dùng token trong khoảng này.
- Logout thu hồi phiên trên server rồi xóa cả hai cookie. Bản sao access/refresh của phiên đó bị từ chối ngay ở request tiếp theo. Các phiên đăng nhập độc lập khác không bị ảnh hưởng.
- Cả ba luồng đổi/reset mật khẩu tăng authVersion cùng thao tác ghi password, nên mọi phiên cũ (kể cả phiên hiện tại) mất hiệu lực; người dùng đăng nhập lại. Khóa tài khoản cũng tăng version, tránh token sống lại khi mở khóa.
- Auth responses dùng Cache-Control: no-store. Frontend đồng bộ refresh trong tab, dùng Web Locks khi trình duyệt hỗ trợ, tự refresh và thử lại một lần khi API được bảo vệ trả 401. Không tự gửi lại mutation vì lỗi mạng.
- Khi triển khai lần đầu, token cũ không có sid/version bị từ chối và cần đăng nhập lại. Không xóa dữ liệu tài khoản/nhân viên; không cần migration phá dữ liệu.

## Chống CSRF cho API admin

Mọi POST/PATCH/PUT/DELETE dưới /admin (gồm login, refresh, logout và multipart upload) bắt buộc header X-Requested-With: AsiaPortal. Kiểm tra Origin theo danh sách CORS chính xác; nếu thiếu thì kiểm tra Referer khi có. Origin null/lạ hoặc thiếu/sai custom header trả 403. GET/HEAD/OPTIONS không thay đổi dữ liệu và được miễn. Header không phải bí mật hay token xác thực: nó buộc JavaScript từ origin khác phải qua CORS preflight, còn HTML form không tự gắn được. SameSite=Lax tiếp tục là lớp bổ sung. Giữ danh sách origin hẹp, không wildcard. curl/Postman phải gửi header này và vẫn cần cookie hợp lệ; CSRF không nhằm chống người đã đánh cắp token hoặc XSS trên origin tin cậy.

Frontend và backend phải triển khai cùng phiên bản để tránh client cũ thiếu header nhận 403. HTTP nội bộ vẫn chạy được, nhưng chống CSRF/thu hồi phiên không thay thế HTTPS.


Khi mở lại trình duyệt chỉ còn refresh cookie, frontend kiểm tra /admin/auth/me rồi khôi phục bằng /admin/auth/refresh khi cần. Luồng xác minh giới hạn 15 giây; hết thời gian hủy request, giải phóng trạng thái chờ và hiện Thử lại. 401/403 chuyển về đăng nhập; lỗi mạng/429 không xóa phiên hay mất nội dung form đang chỉnh. Sự kiện online, focus và mỗi 60 giây kích hoạt kiểm tra lại.

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

Áp dụng cho cả Admin gốc và Quản lý. POST `/admin/auth/password/request-otp` nhận `{ currentPassword, newPassword }`, xác minh mật khẩu hiện tại bằng bcrypt; mật khẩu mới 8–32 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt, không có khoảng trắng và khác hiện tại. Chưa cập nhật password ở bước này. OTP chỉ gửi đến email lấy từ tài khoản hiện tại trong MongoDB, không nhận email đích từ client.

Client nhận `{ requestId, email, expiresInSeconds, resendAfterSeconds }` và hiển thị ô nhập OTP. PATCH `/admin/auth/password` bắt buộc `{ requestId, code }` (UUID và 6 chữ số); payload đổi trực tiếp cũ bị từ chối. Không lưu mật khẩu/OTP trong localStorage; sau khi gửi mã thành công, giao diện xóa các ô mật khẩu khỏi state.

Mã ngẫu nhiên 6 số được HMAC-SHA256 bằng OTP_SECRET với mục đích, account ID và request ID; bản ghi riêng lưu hash OTP, hash bcrypt của mật khẩu mới và hash mật khẩu hiện tại, cả ba đều select:false. TTL dọn bản ghi và service vẫn kiểm tra hạn 3 phút. Sai tối đa 5 lần cho mỗi yêu cầu, kể cả sau gửi lại; bộ đếm cập nhật nguyên tử. POST `/admin/auth/password/resend-otp` nhận `{ requestId }`, chờ 60 giây, tối đa 3 lần; gửi lại tạo mã mới và vô hiệu mã trước. Yêu cầu mới thay thế yêu cầu cũ, cũng chịu cooldown 60 giây.

Xác nhận dùng transaction để xóa OTP một lần và cập nhật password có điều kiện: tài khoản vẫn active/admin hoặc manager, email và hash password cũ chưa thay đổi. OTP của tài khoản khác, hết hạn, đã dùng hoặc đã bị thay thế đều bị chặn; hai xác nhận đồng thời chỉ một lần thành công. Nếu tài khoản/password thay đổi, transaction rollback và yêu cầu nhập lại mật khẩu. Lỗi SMTP trả 503; gửi lần đầu thất bại xóa đúng yêu cầu, gửi lại thất bại khôi phục mã trước nếu chưa có yêu cầu mới thay thế.

Limiter theo account: gửi mới/gửi lại dùng chung 10 lượt trong rateLimitWindowMs; xác nhận 30 lượt trong cùng cửa sổ (mặc định 15 phút). Dùng SMTP và OTP_SECRET hiện có. Việc Admin đặt lại mật khẩu cho tài khoản khác vẫn qua API quản trị riêng theo chính sách Admin gốc.

## OTP đăng ký và đặt lại mật khẩu

Luồng quên mật khẩu dùng generation `requestId` nội bộ mới cho mỗi lượt phát hành OTP, đưa ID này vào HMAC-SHA256. API vẫn nhận email/code và không trả ID/hash/mã. Các bản ghi cũ chưa có ID được hỗ trợ đến khi hết hạn, nhưng chỉ so khớp với bản ghi còn thiếu ID để không tác động yêu cầu mới.

Nhập sai tăng `otpAttempts` bằng `$inc` có điều kiện khớp email/generation/hash, còn hạn và dưới 5 lần; lần thứ 5 và các lần tiếp theo bị từ chối 429. Không xóa bản ghi khi đạt ngưỡng để tránh làm mất trạng thái khóa. Gửi lại giữ số lần sai, đổi generation/code nguyên tử, giới hạn 3 lần và chờ 60 giây. Bắt đầu yêu cầu mới cũng phải qua cooldown theo email để không ghi đè yêu cầu đang chờ từ nhiều IP. SMTP lỗi chỉ dọn/khôi phục đúng generation, không ghi đè bộ đếm nhập sai hay mã được phát hành sau đó.

Đặt lại mật khẩu băm mật khẩu trước rồi dùng MongoDB transaction để tiêu thụ OTP bằng `findOneAndDelete` có điều kiện (generation/hash/hạn/số lần sai), tìm account và cập nhật password + tăng authVersion trong cùng transaction. Hai yêu cầu đồng thời chỉ một lần được commit. OTP hết hạn, bị thay thế hoặc đạt ngưỡng trong lúc băm sẽ bị từ chối trước khi ghi password. Nếu ghi account lỗi, transaction rollback cả việc tiêu thụ OTP. Chạy trên MongoDB replica set/mongos hỗ trợ transaction, giống các luồng đổi mật khẩu và quản trị tài khoản; không fallback sang hai thao tác độc lập.

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

Backend chặn tự hạ quyền, tự khóa, tự xóa và mất Admin gốc active cuối cùng. Các thay đổi tài khoản dùng transaction và một khóa ghi chung; actor được kiểm tra lại sau khi nhận khóa để ngăn request đồng thời của người vừa bị hạ quyền. Quyền quản lý đủ 17 action không bao gồm quyền đổi loại tài khoản; cổng role admin luôn được giữ. Quyền `media:trash` mới dành riêng cho xem, khôi phục và xóa vĩnh viễn trong thùng rác truyền thông; nhóm cũ không tự được cấp thêm quyền này. Chi tiết contract và concurrency tại `api-response.md` và `media-trash.md`.

Form tạo/chỉnh sửa có màu sắc, icon và xem trước nhãn; hai giá trị được lưu qua POST/PATCH và dùng cho nhãn ở danh sách nhóm/tài khoản. Nút thùng rác mở hộp xác nhận xóa có tên nhóm và số tài khoản đang gán. Sau xác nhận, DELETE xóa nhóm và gỡ nhóm khỏi tài khoản; tài khoản giữ nguyên, quyền từ các nhóm còn lại vẫn được hợp như trước. Quyền nhóm đã xóa bị thu hồi ở request xác thực kế tiếp.

## Đổi email khi đã đăng nhập

Admin gốc và Quản lý đều được đổi email của chính mình tại `/admin/account/change-email`, mở từ mục Đổi email trong Tài khoản của tôi. POST `/admin/auth/email/request-otp` nhận `{ newEmail }`; backend lấy chủ tài khoản từ cookie, không cho chọn account ID khác. Email mới dùng chung schema email công ty khi tạo tài khoản: trim/lowercase, đúng định dạng, tối đa 150 ký tự, đuôi chính xác @asiafnb.com. Đã bật lại giới hạn tên miền sau khi kiểm thử. Từ chối email giống hiện tại (400) hoặc đã có ở bất kỳ tài khoản/trạng thái nào (409).

OTP được gửi đến email mới. Email tài khoản vẫn giữ nguyên đến khi PATCH `/admin/auth/email` nhận đúng `{ requestId, code }`. Mã 6 số dùng HMAC-SHA256 với OTP_SECRET, mục đích email-change, chủ tài khoản, UUID yêu cầu và email đích; DB chỉ lưu hash OTP, snapshot email hiện tại và hash password (select:false). TTL và service kiểm tra hạn 3 phút. Tối đa 5 lần sai mỗi yêu cầu, giữ số lần sai khi gửi lại; cooldown 60 giây, tối đa 3 gửi lại. Limiter riêng theo account: request/resend chung 10, confirm 30 trong cửa sổ cấu hình (mặc định 15 phút).

Gửi lại tạo mã khác và vô hiệu mã trước; tạo yêu cầu mới thay thế yêu cầu trước. Lỗi SMTP gửi lần đầu xóa đúng yêu cầu, lỗi gửi lại khôi phục mã trước nếu vẫn là cùng phiên. Không trả OTP/hash trong response.

Xác nhận dùng transaction: tiêu thụ OTP một lần, kiểm tra lại email chưa bị chiếm, rồi cập nhật email có điều kiện tài khoản còn active/admin hoặc manager, email/password cũ chưa đổi. Unique index account.email chặn hai tài khoản đồng thời nhận cùng địa chỉ; lỗi trả 409 và rollback. Các trường role/status/nhóm quyền/password không bị thay đổi. Chỉ tài khoản đang đăng nhập được tác động, nên Quản lý không thể dùng API này để sửa Admin gốc.

Sau thành công, response `{ email }` cập nhật metadata phiên và thông tin tài khoản. Middleware lấy email hiện tại từ MongoDB theo JWT sub, nên cookie hiện tại tiếp tục hoạt động; lần đăng nhập sau dùng email mới và password cũ. Email cũ không còn đăng nhập được. OTP đổi mật khẩu đã phát hành cho email cũ bị snapshot check từ chối.

Mật khẩu đặt mới còn bị giới hạn tối đa 72 byte UTF-8 ở cả frontend và backend, vì bcrypt bỏ qua phần vượt giới hạn này. Giới hạn ký tự 8–32 và các yêu cầu độ mạnh vẫn giữ nguyên. Không áp dụng quy tắc mới lên luồng kiểm tra mật khẩu cũ; hash cũ không tự được sửa, mật khẩu cũ vượt 72 byte cần được đặt lại để loại bỏ việc cắt ngắn trước đây.

## Quản lý phiên đăng nhập

Hai yêu cầu GET tải danh sách phiên và danh sách tài khoản trong bộ chọn có hạn chờ tổng 15 giây, gồm đọc response, retry và khôi phục xác thực. Hết hạn sẽ hủy request, hiện lỗi cùng nút thử lại; không xóa cookie. Hủy do chuyển tài khoản/rời trang không hiển thị lỗi và không ghi đè dữ liệu của tài khoản mới.

Trang `/admin/sessions` cho Admin gốc và Quản lý xem/thu hồi phiên của chính mình. Admin gốc được chọn tài khoản khác; Quản lý bị chặn ở service khi truyền `accountId` của người khác, kể cả biết ID bản ghi phiên. Đây là chức năng riêng, không cấp quyền vào trang Phân quyền quản lý.

Danh sách chỉ gồm phiên còn hạn, đúng authVersion của tài khoản còn được vào admin. Hiển thị trình duyệt/hệ điều hành (suy từ User-Agent, có thể giả mạo), IP đăng nhập và IP server quan sát gần nhất, thời điểm tạo/hoạt động/hết hạn, nhãn phiên hiện tại. Không định vị địa lý, lấy MAC, hostname hoặc ràng buộc xác thực vào IP. Phiên cũ thiếu metadata hiển thị Chưa xác định. Hoạt động gần nhất cập nhật tối đa khoảng mỗi phút khi có request hợp lệ; không có nghĩa là người dùng đang trực tuyến.

Thu hồi một phiên dùng ID bản ghi MongoDB với điều kiện accountId; không trả mã phiên JWT, hash, nonce hoặc token. Thu hồi các phiên khác giữ mã phiên hiện tại. Thu hồi tất cả tăng authVersion nguyên tử rồi dọn phiên có version cũ, tránh xóa phiên đăng nhập mới được tạo đồng thời. Thu hồi phiên hiện tại xóa cả hai cookie và UI chuyển về đăng nhập. Mọi thao tác có hộp xác nhận, giữ hộp và báo lỗi khi API thất bại. Audit dùng action session.revoked/session.revoked_others/session.revoked_all, entity account; không ghi mã phiên/token. Không thêm OTP đăng nhập.

## Chỉnh sửa tài khoản quản lý

Nút Chỉnh sửa mở /admin/access-control/accounts/[id]/edit, gồm Thông tin tài khoản, Phân quyền và Mật khẩu. Chỉ Admin gốc được truy cập UI/API này; Quản lý bị từ chối kể cả có đủ quyền nghiệp vụ. Email vẫn là định danh đăng nhập, không có tên đăng nhập riêng và không có ô Ghi chú.

Admin gốc đổi email của tài khoản khác qua PATCH /admin/accounts/:id không cần OTP. Đổi email của chính mình bắt buộc dùng quy trình OTP đến email mới; API quản trị chặn tự đổi email để tránh bỏ qua xác nhận. Các quy tắc bảo vệ Admin cuối cùng, tự khóa/hạ quyền/xóa vẫn giữ nguyên.

Form dùng chung validate với tạo tài khoản: họ tên 2–100 ký tự theo quy tắc tên, email công ty @asiafnb.com được trim/lowercase, số Việt Nam chuẩn hóa +84/0 và định dạng dấu cách/chấm/gạch. Kiểm tra trùng khi blur cho contact thay đổi, API lưu luôn kiểm tra lại. Hiển thị fieldErrors tại ô tương ứng; không làm mất dữ liệu khi lỗi.

Tab Mật khẩu gọi PATCH /admin/accounts/:id/password với password, confirmPassword bắt buộc, notifyUser tùy chọn. Mật khẩu 8–32 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt, không chứa khoảng trắng và xác nhận trùng chính xác. Không xem hoặc gửi mật khẩu qua email; tùy chọn thông báo chỉ gửi sự kiện đặt lại. Lỗi gửi mail sau khi đã lưu được báo riêng bằng notificationSent=false. Không có tính năng bắt buộc đổi mật khẩu lần đăng nhập sau, các cờ dữ liệu cũ bị bỏ qua.

Thay đổi thông tin, quyền hoặc mật khẩu chưa lưu đều kích hoạt hộp hỏi chung khi Hủy/quay lại/sidebar/browser Back/reload/đóng tab. Form chưa sửa hoặc đã lưu thành công không hỏi. Lưu và rời trang kiểm tra toàn bộ các phần đang sửa trước khi gọi API. Ghi audit account.updated/account.password_reset, không ghi mật khẩu.
