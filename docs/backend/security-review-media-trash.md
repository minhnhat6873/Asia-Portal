# Rà soát bảo mật cho thùng rác truyền thông

Ngày kiểm tra: 26/10/2026.

## Thay đổi đã thực hiện

- Bổ sung quyền `media:trash` ở backend, catalog cấp quyền và guard frontend; kiểm tra quyền tại API cho từng thao tác, không dựa vào việc ẩn nút.
- Xóa vĩnh viễn chỉ chấp nhận bài đang ở thùng rác. Khôi phục luôn về draft, không dùng trạng thái trong body để xuất bản thay người có quyền đăng.
- Actor xóa mềm lấy từ phiên, không lấy từ body. Trường xóa mềm/ID ảnh không thể sửa qua schema sửa bài thông thường.
- Bài trong thùng rác không có trong public, kể cả URL trực tiếp. Projection public dùng object loại trừ metadata rõ ràng.
- Siết dọn ảnh bìa: không suy ra ID Cloudinary từ URL tùy ý; chỉ dọn ID server ghi nhận trong namespace media và không còn tham chiếu bởi bài khác.
- Tài khoản chỉ có quyền đăng/ẩn không được đưa file ảnh bìa vào pipeline Cloudinary; file filter kiểm tra quyền tải ảnh trước khi lưu lên dịch vụ ngoài.
- Cập nhật các thư viện bị cảnh báo: Next.js 16.4.1, DOMPurify 3.4.17, sanitize-html 2.18.1, Express 5.3.0, express-rate-limit 8.7.1, Multer 2.5.0, Nodemailer 10.1.4; cập nhật/pin các dependency gián tiếp body-parser, ip-address và source-map-js ở bản vá.
- Đồng bộ eslint-config-next 16.4.1 và cấu hình Jest để kiểm tra các thư viện parser ESM mới.
- Vá dependency công cụ phát triển: Handlebars >=4.7.10, các nhánh brace-expansion tương thích và Zod >=4.6.6.

Backend cần Node >=22.12 và <25 do yêu cầu của sanitizer đã vá; Docker dùng Node 22, Render đã đổi từ 20 sang 22. Máy đang kiểm tra dùng Node 24.22.

## Phạm vi xác minh

- Kiểm thử bảo mật/lifecycle: `backend/tests/media-trash-security.test.ts`, `backend/tests/media.service.test.ts`.
- Kiểm thử catalog, xác thực, phân quyền, dữ liệu public, sanitizer và các nghiệp vụ hiện có trong bộ Jest backend.
- TypeScript backend/frontend và kiểm tra build frontend.
- Kết quả bộ Jest: 23 bộ kiểm thử, 314 kiểm thử đạt; bản build production Next.js 16.4.1 thành công, có route `/admin/media/trash`.
- Kiểm tra giao diện bằng trình duyệt với API mô phỏng: tải danh sách, guard quyền/thùng rác là trang mặc định, xác nhận/hủy, giữ dữ liệu khi API lỗi, khôi phục, xóa vĩnh viễn và thu hồi quyền đều đạt. Không thực hiện thử nghiệm phá hủy trên bài viết thật.
- `yarn audit --groups dependencies --json` cho các dependency chạy production: kết quả sau cập nhật là 0 cảnh báo ở cả frontend và backend tại thời điểm kiểm tra. Kết quả audit không phải cam kết hệ thống không có lỗ hổng chưa công bố hoặc lỗi cấu hình triển khai.
- Quét thêm `yarn audit --json` toàn bộ dependency, gồm công cụ phát triển, cũng cho kết quả 0 cảnh báo sau cập nhật.

Chi tiết API, hành vi và giới hạn vận hành: [media-trash.md](media-trash.md).

## Điểm còn có sẵn ngoài phạm vi tính năng

Quét ESLint toàn frontend vẫn báo 4 lỗi `react-hooks/set-state-in-effect` có sẵn: 1 ở `RichTextEditor.tsx`, 3 ở `MeetingManagement.tsx`, cùng các cảnh báo khác (ảnh `<img>`, biến chưa dùng). Các file mới của thùng rác không có lỗi ESLint; TypeScript và build production đạt. Không coi các cảnh báo/lỗi lint này là bằng chứng hệ thống hoàn toàn không có lỗi.
