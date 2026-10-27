# Hiển thị hệ thống nội bộ WANA

Công tắc nằm trong Bảng điều khiển admin, dưới các ô thống kê. Chỉ tài khoản role `admin` (Toàn quyền Admin) được xem/thay đổi công tắc. Tài khoản manager, kể cả có `dashboard:view`, không được cập nhật.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/user/site-settings` | Công khai, chỉ đọc |
| GET | `/admin/site-settings` | Xác thực và role admin |
| PATCH | `/admin/site-settings` | Xác thực và role admin |

PATCH chỉ nhận `{ "internalSystemsEnabled": true }` hoặc `false` kiểu boolean; không nhận chuỗi, object hoặc trường bổ sung. Response theo envelope hiện có, `data` chỉ có `internalSystemsEnabled`, không trả metadata quản trị. Cấu hình lưu trong MongoDB `SiteSettings`, document `_id = public-navigation`. Chưa có document tương đương tắt; GET không tạo document. PATCH lưu giá trị tường minh, không dùng phép đảo trạng thái trên server. Ghi audit `site_settings.updated` với actor từ phiên đăng nhập và giá trị đã lưu.

Navbar ẩn mục WANA khi tắt/chưa tải/lỗi đọc cấu hình. Khi bật, hiển thị CRM, Wiki, LMS, ERP với các URL cố định đã có trong `InternalSystemsMenu`. Mobile hiển thị trong menu điều hướng thu gọn. Public tải lại cấu hình khi đổi đường dẫn, quay lại tab hoặc tối đa mỗi 60 giây khi tab đang hiển thị. API cấu hình dùng `Cache-Control: no-store`.

Công tắc chỉ điều khiển hiển thị liên kết trên portal; không bật/tắt hay thay đổi phân quyền của các dịch vụ WANA bên ngoài. Các liên kết mở tab mới với `noopener noreferrer`.

Kiểm tra tự động: `backend/tests/site-settings-security.test.ts` dùng HTTP router thật với repository mô phỏng để kiểm tra 401/403, role từ database, body injection, giá trị mặc định, whitelist public, lưu bật/tắt và actor audit. Kiểm tra trình duyệt với API mô phỏng cho lưu/tải lại, đồng bộ public, menu desktop/mobile, lỗi lưu và breakpoint 576/768/992/1200px; không thay đổi cấu hình thật trong kiểm thử giao diện.
