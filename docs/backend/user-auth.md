# Xác thực cổng người dùng

API riêng `/user/auth` giữ luồng quản trị `/admin/auth` hoạt động độc lập.

| Phương thức | Endpoint | Mục đích |
| --- | --- | --- |
| POST | `/login` | Kiểm tra thông tin, trạng thái active; cấp phiên user |
| GET | `/me` | Xác minh access token, phiên và authVersion trong DB |
| POST | `/refresh` | Thay refresh token bằng compare-and-swap |
| POST | `/logout` | Thu hồi phiên user và xóa cookie user |
| POST | `/register` | Gửi OTP, giữ thông tin đăng ký với mật khẩu đã bcrypt |
| POST | `/register/verify-otp` | Dùng OTP một lần để tạo tài khoản user/pending |
| POST | `/register/resend-otp` | Gửi lại OTP đăng ký |
| POST | `/forgot-password` | Yêu cầu OTP; phản hồi chung khi không có tài khoản |
| POST | `/forgot-password/verify-otp` | Kiểm tra mã, chưa đổi mật khẩu |
| POST | `/forgot-password/resend-otp` | Gửi lại OTP khôi phục |
| POST | `/forgot-password/reset` | Xác minh lại, tiêu thụ OTP và đổi mật khẩu |

Các endpoint trong bảng có tiền tố `/user/auth`. Đăng ký có thể tắt bằng
`USER_REGISTRATION_ENABLED=false`. Khi bật, chỉ nhận email công ty đã định nghĩa
trong schema backend; lỗi không trả biểu thức hay đuôi email được phép.
Frontend chỉ kiểm tra định dạng, không đưa danh sách tên miền vào mã trình duyệt.
Mật khẩu mới 8–32 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt, không khoảng
trắng và không dấu; xác nhận phải trùng nguyên văn. Số di động Việt Nam được
chuẩn hóa từ `+84` thành `0`, hỗ trợ dấu cách/dấu chấm/gạch nối.

OTP 6 số ngẫu nhiên, hạn 3 phút; chỉ lưu HMAC-SHA256 bằng `OTP_SECRET`, ràng buộc
email, mục đích và requestId. Sai tối đa 5 lần, cập nhật nguyên tử. Gửi lại đợi
60 giây, tối đa 3 lần và không đặt lại số lần sai. Không cho yêu cầu mới ghi đè
challenge còn hạn. SMTP lỗi xóa/khôi phục đúng thế hệ challenge bằng CAS.

Xác minh đăng ký và đặt lại mật khẩu dùng transaction MongoDB (cần replica set),
tiêu thụ đúng một challenge. Tài khoản mới luôn user/pending, không tin role hay
status gửi từ client. Đổi mật khẩu kiểm tra snapshot authVersion và tăng version
để vô hiệu các phiên cũ; đổi mật khẩu không tự kích hoạt tài khoản pending.

Cookie `asia_user_token` và `asia_user_refresh_token`: HttpOnly, SameSite=Lax,
host-only, Secure theo cấu hình HTTPS. JWT user có audience `asia-user`; middleware
admin từ chối audience này kể cả khi chép vào cookie admin. Quyền quản trị luôn
lấy từ DB; đăng nhập cổng user không cấp quyền admin.

Mutation yêu cầu `X-Requested-With: AsiaPortal` và Origin/Referer tin cậy. Có giới
hạn theo IP, thêm giới hạn đăng nhập theo hash email. Bộ đếm rate limit nằm trong
bộ nhớ tiến trình; triển khai nhiều backend cần kho dùng chung. Lỗi DB trả 503,
không đổi thành sai mật khẩu và không xóa cookie. Unit/API tests dùng repository
và mail mock, không gửi email thật hoặc ghi dữ liệu Atlas.
