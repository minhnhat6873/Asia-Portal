# Các trang xác thực

Mỗi bước có thư mục route và thành phần riêng:

| Bước | Người dùng | Quản trị |
| --- | --- | --- |
| Quên mật khẩu | `/forgot-password` | `/admin/forgot-password` |
| Nhập OTP | `/otp` | `/admin/otp` |
| Đặt lại mật khẩu | `/reset-password` | `/admin/reset-password` |

Route nằm trong `frontend/src/app/(page)/`, mỗi thư mục có `page.tsx`.
Thành phần nằm trong `frontend/src/features/{forgot-password,otp,reset-password}/`
và `frontend/src/features/admin/{forgot-password,otp,reset-password}/`.

## Trạng thái giữa các bước

`features/auth/RecoveryContext.tsx` giữ email, mục đích, thời hạn và mã đã nhập
trong bộ nhớ của layout. Khu vực người dùng và quản trị có provider riêng.
Không lưu mã OTP hoặc mật khẩu trong URL, localStorage hay sessionStorage.
Tải lại trang hoặc mở tab mới sẽ mất trạng thái và quay về bước quên mật khẩu.
Đăng ký người dùng cũng chuyển tới `/otp` với mục đích `register`.

Provider chỉ hỗ trợ chuyển trang, không cấp quyền đổi mật khẩu. Với quản trị,
backend vẫn xác minh mã qua API `verify-otp`, sau đó kiểm tra lại mã khi gọi API
`reset`; mã hết hạn, sai hoặc đã dùng phải bị backend từ chối như trước.
Các route khôi phục quản trị là route công khai ở proxy, guard và shell;
chúng không được dùng để bỏ qua bảo vệ những route quản trị khác.

## Xác thực người dùng

Các trang gọi API `/user/auth/*` qua `services/user-auth.service.ts`.
Đăng ký xác minh email bằng OTP rồi tạo tài khoản `pending`; admin phải phê duyệt
trước khi đăng nhập. Liên kết đăng ký tuân theo `USER_REGISTRATION_ENABLED`.
Quên mật khẩu trả thông báo chung, không xác nhận email có tồn tại; backend
kiểm tra lại OTP và cập nhật mật khẩu trong transaction ở bước cuối.

Phiên user dùng cookie HttpOnly riêng và JWT có audience `asia-user`, không
được dùng thay cookie/token quản trị. Ghi nhớ đăng nhập điều khiển thời hạn cookie,
không lưu token hoặc mật khẩu trong localStorage. Navbar kiểm tra `/me`, chỉ gọi
`/refresh` khi nhận 401; lỗi mạng hoặc database không tự xóa phiên đã biết.
Các mutation có header chống CSRF, thời gian chờ hữu hạn và không tự gửi lại.

## Quy ước đường dẫn

Cả cổng là nội bộ: ai truy cập cũng phải đăng nhập.

- `/user/*`: trang cần đăng nhập (trang chủ `/user`, `/user/news`, `/user/employees`,
  `/user/diagram`, `/user/meeting`, `/user/vehicles`, `/user/faq`, `/user/about-asia`,
  `/user/account/*`, `/user/downloads/*`).
- `/admin/*`: trang quản trị, đăng nhập riêng.
- Đường dẫn không có `/user` hay `/admin` là trang công khai: `/login`, `/register`,
  `/forgot-password`, `/otp`, `/reset-password`.

`frontend/src/proxy.ts` chuyển `/` sang `/user` (có cookie phiên user) hoặc `/login`, và đưa
người chưa có cookie từ `/user/*` về `/login?next=...`. `app/(page)/user/layout.tsx`
(`UserRouteGuard`) còn chặn phiên hết hạn hoặc bị thu hồi. Sau đăng nhập chỉ quay lại
đường dẫn `/user...` (`afterLoginPath` trong `lib/safeRedirect.ts`). Backend vẫn tự kiểm tra
token và trạng thái tài khoản ở mọi API `/user/*` trừ `/user/auth/*` và `/user/site-settings`.
Thêm trang nội bộ mới thì đặt dưới `app/(page)/user/`; trang công khai đặt ngoài thư mục đó.
