# Bài truyền thông hết hạn

- Chọn Đăng tin vĩnh viễn thì ô ngày hết hạn bị khóa và ngày hết hạn được xóa khi lưu. Khi bỏ chọn, bắt buộc chọn ngày hết hạn trước khi lưu. API chuẩn hóa bài vĩnh viễn về `expiryDate: null`; bài có thời hạn phải có ngày hết hạn. PATCH chỉ đổi trạng thái giữ chế độ và thời hạn đã lưu. Bài cũ thiếu ngày, không đăng vĩnh viễn phải bổ sung ngày hoặc chọn vĩnh viễn khi sửa/đăng lại; vẫn được chuyển sang Ẩn tin.

- Ngày hết hạn có hiệu lực đến hết ngày đã chọn theo giờ Việt Nam. Ví dụ, hết hạn 26/10 thì từ 00:00 ngày 27/10 bài được coi là hết hạn.
- Bài `published` đã hết hạn và không bật `publishIndefinitely` tự chuyển thành `draft` (Ẩn tin), giữ nguyên nội dung và ảnh. Job chạy khi khởi động và mỗi 60 giây; danh sách, chi tiết quản trị và thống kê cũng đồng bộ trạng thái trước khi đọc dữ liệu.
- Quản trị viên có quyền đăng có thể bật lại bài đã hết hạn. Máy chủ lưu cờ nội bộ `showAfterExpiry`, giữ ngày hết hạn và trả `isExpired: true`; bài được hiển thị công khai kèm nhãn hết hạn. Cờ này không nhận từ client và không có trong response.
- Bộ lọc public kiểm tra hạn ngay trong truy vấn, bao gồm bài hết hạn đã bật lại; danh sách, tìm kiếm, đếm và chi tiết dùng cùng điều kiện. Tạo mới bài đã hết hạn với trạng thái published vẫn bị từ chối.
- Ẩn bài, chuyển vào thùng rác hoặc chỉnh thời hạn để bài chưa hết hạn sẽ xóa cờ nội bộ. Bài có ngày hết hạn mới sau đó tiếp tục được tự ẩn khi đến hạn. Muốn bỏ nhãn hết hạn, sửa thời hạn hoặc chọn Đăng tin vĩnh viễn.
- Bài đăng vĩnh viễn không bị tự ẩn và không có nhãn hết hạn, kể cả khi còn lưu ngày hết hạn cũ. Đổi thời hạn không tự đăng lại bài đang ẩn.
- Trang quản trị cập nhật danh sách mỗi 60 giây khi đang hiển thị và khi quay lại cửa sổ. Hộp xác nhận đăng lại cho biết bài vẫn mang nhãn hết hạn.
- Với bài hết hạn, menu trạng thái hiện lựa chọn “Đăng tin đã hết hạn”. Xác nhận sẽ hiển thị bài trên public, giữ nguyên ngày hết hạn và nhãn “Tin đã hết hạn”; trạng thái quản trị hiện “Đang hiển thị (hết hạn)” ở cả bảng và thẻ bài viết. Đây là thao tác đăng lại, không phải gia hạn hay đăng vĩnh viễn.
- Bảng quản trị gộp ngày đăng và thời hạn vào cùng cột: bài vĩnh viễn hiện “Thời hạn: Không hết hạn” và nhãn Vĩnh viễn; bài hết hạn hiện ngày màu đỏ và nhãn Đã hết hạn.
- Máy chủ lưu `hiddenReason`: `expired` khi hệ thống tự ẩn bài, `manual` khi admin ẩn/tạo bản nháp/chuyển vào thùng rác/khôi phục, `null` khi đăng hoặc không biết nguyên nhân (bài cũ). Sửa nội dung bài đang ẩn giữ nguyên nguyên nhân. Trường này chỉ đọc trong API admin, không nhận từ client và không trả ra public; không suy đoán nguyên nhân từ ngày hết hạn.
- “Đã ẩn tự động” chỉ là nhãn trạng thái khi bài draft có `hiddenReason: expired`, không có trong lựa chọn. Menu luôn có “Ẩn tin”; admin vẫn chọn được thao tác này cho bài tự ẩn để chuyển thành ẩn thủ công. Bài cũ không biết nguyên nhân hiện “Ẩn tin”, không cần cập nhật dữ liệu hàng loạt.

Kiểm thử: `backend/tests/media-expiry.test.ts`, `backend/tests/media.service.test.ts`, `backend/tests/dashboard.service.test.ts`.
