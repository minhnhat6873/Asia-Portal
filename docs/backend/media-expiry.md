# Bài truyền thông hết hạn

- Chọn Đăng tin vĩnh viễn thì ô ngày hết hạn bị khóa và ngày hết hạn được xóa khi lưu. Khi bỏ chọn, bắt buộc chọn ngày hết hạn trước khi lưu. API chuẩn hóa bài vĩnh viễn về `expiryDate: null`; bài có thời hạn phải có ngày hết hạn. PATCH chỉ đổi trạng thái giữ chế độ và thời hạn đã lưu. Bài cũ thiếu ngày, không đăng vĩnh viễn phải bổ sung ngày hoặc chọn vĩnh viễn khi sửa/đăng lại; vẫn được chuyển sang Ẩn tin.

- Ngày hết hạn có hiệu lực đến hết ngày đã chọn theo giờ Việt Nam. Ví dụ, hết hạn 26/10 thì từ 00:00 ngày 27/10 bài được coi là hết hạn.
- Bài `published` đã hết hạn và không bật `publishIndefinitely` tự chuyển thành `draft` (Ẩn tin), giữ nguyên nội dung và ảnh. Job chạy khi khởi động và mỗi 60 giây; danh sách, chi tiết quản trị và thống kê cũng đồng bộ trạng thái trước khi đọc dữ liệu.
- Bộ lọc public vẫn kiểm tra hạn ngay trong truy vấn, nên bài hết hạn không hiển thị trong lúc chờ job.
- POST/PATCH yêu cầu `status: published` cho bài hết hạn trả HTTP 400: “Bài viết đã hết hạn. Để đăng lại, vui lòng chọn Đăng tin vĩnh viễn hoặc đặt ngày hết hạn mới.”
- Có thể lưu chỉnh sửa bài hết hạn ở trạng thái Ẩn tin. Muốn đăng lại, đặt ngày hết hạn từ hôm nay trở đi (vẫn sau ngày đăng ít nhất một ngày), hoặc chọn Đăng tin vĩnh viễn, rồi chọn Đăng tin.
- Bài đăng vĩnh viễn không bị tự ẩn và không có nhãn hết hạn, kể cả khi còn lưu ngày hết hạn cũ. Đổi thời hạn không tự đăng lại bài đang ẩn.
- Trang quản trị cập nhật danh sách mỗi 60 giây khi đang hiển thị và khi quay lại cửa sổ. Chọn Đăng tin với bài hết hạn hiện hướng dẫn cùng nút Chỉnh sửa bài viết nếu tài khoản có quyền sửa.
- Bảng quản trị gộp ngày đăng và thời hạn vào cùng cột: bài vĩnh viễn hiện “Thời hạn: Không hết hạn” và nhãn Vĩnh viễn; bài hết hạn hiện ngày màu đỏ và nhãn Đã hết hạn. Trạng thái published hiện “Đang hiển thị”; draft hết hạn hiện “Đã ẩn tự động”, các draft còn lại hiện “Ẩn tin”.

Kiểm thử: `backend/tests/media-expiry.test.ts`, `backend/tests/media.service.test.ts`, `backend/tests/dashboard.service.test.ts`.
