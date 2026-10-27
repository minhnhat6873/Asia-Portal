# Chọn khung giờ đặt phòng public

Trang `/meeting` dùng lịch đã xác nhận để tính lựa chọn theo đúng phòng và ngày. Yêu cầu OTP đang chờ không giữ chỗ.

- Giờ bắt đầu đã qua không xuất hiện. Giờ tương lai đã kín lịch vẫn hiển thị nhưng bị vô hiệu hóa, kèm “Đã có lịch”. Giờ 11:45 không đủ 30 phút trước nghỉ trưa nên có nhãn “Giờ nghỉ trưa”.
- Thời lượng chỉ có các lựa chọn từ 30 phút, tăng từng 15 phút, không trùng giờ nghỉ 12:00–13:00 hoặc vượt 17:00, và chừa ít nhất 15 phút trước/sau lịch khác.
- Ví dụ Phòng 1 đã đặt 09:00–10:00: cuộc họp trước đó kết thúc chậm nhất 08:45, cuộc họp tiếp theo bắt đầu sớm nhất 10:15. Phòng 2 và ngày khác không bị khóa theo lịch này.
- Đổi phòng/ngày sẽ tính lại lựa chọn. Nếu khung giờ trước đó không dùng được, chọn giờ còn trống đầu tiên; nếu ngày đó kín lịch, giữ ngày và thông báo hết khung giờ.
- Khi mở form, tải lại lịch. Không cho gửi yêu cầu nếu chưa kiểm tra được lịch trống. Poll/focus tiếp tục cập nhật lịch trong nền; phản hồi cũ không ghi đè phản hồi tải lại mới hơn.

## Người khác đặt trong lúc đang nhập hoặc chờ OTP

Backend kiểm tra trùng lịch khi gửi OTP và khi xác nhận OTP. Ràng buộc unique multikey `{ roomId, reservationSlots }` hiện có bảo vệ thao tác ghi cuối cùng, kể cả khi hai yêu cầu cùng vượt qua bước kiểm tra trước. Duplicate key trả HTTP 409; không tạo khóa phòng từ yêu cầu OTP đang chờ.

Khi public gặp 409 ở bước gửi hoặc xác nhận, form trở về phần thông tin và tải lại lịch. Giữ tiêu đề, tên, email, phòng ban, phòng, ngày và giờ đã chọn để người dùng sửa. Xóa trạng thái yêu cầu OTP cũ; sau khi chọn khung giờ hợp lệ phải gửi và xác nhận OTP mới. Không tự chuyển sang phòng hoặc giờ khác trong trường hợp này.

Thông báo trùng lịch: “Khung giờ này vừa được người khác đặt. Vui lòng chọn giờ khác hoặc đổi phòng họp.”

## Kiểm tra

- `cd frontend` rồi `yarn test:meeting`: ranh giới nghỉ 15 phút, giới hạn thời lượng, giờ nghỉ trưa, ngày/phòng độc lập, kín ngày, giải phóng giờ sau khi bỏ lịch.
- `backend/tests/meeting-booking-conflicts.test.ts`: gửi OTP không tạo booking, từ chối lịch đã kín trước khi gửi email, kiểm tra lại khi xác nhận và xử lý duplicate key khi hai yêu cầu cạnh tranh. Bài kiểm thử đồng thời mô phỏng ràng buộc ghi bằng bộ nhớ; không thay thế kiểm thử tích hợp trên MongoDB riêng.
- Kiểm tra trình duyệt với API mô phỏng cho lựa chọn bị khóa, thời lượng, xung đột 409 tại cả hai bước, giữ thông tin và xác nhận lại OTP, lỗi tải lịch. Không ghi lịch hoặc gửi email thật trong kiểm tra giao diện.

Không thay đổi giao diện hay quyền quản trị của `/admin/meetings`.
