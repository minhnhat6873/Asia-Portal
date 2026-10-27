# Thống kê Bảng điều khiển

`GET /admin/dashboard/summary` yêu cầu `dashboard:view`, trả `Cache-Control: no-store`. Ba ô trên dashboard và badge nhân sự/truyền thông của sidebar (với người có quyền xem dashboard) lấy cùng response này, không lấy số dòng của danh sách đã lọc/phân trang.

- **Tổng số nhân viên:** mọi hồ sơ chưa xóa mềm, gồm đang làm việc, thử việc và đã nghỉ. Không tính hồ sơ trong thùng rác.
- **Số phòng ban:** chỉ các giá trị phòng ban có ít nhất một hồ sơ nhân viên chưa xóa mềm; không tính toàn bộ 16 phòng trong danh mục. Bỏ phòng rỗng và không đếm trùng do khoảng trắng đầu/cuối.
- **Bài viết:** mọi bài chưa xóa mềm, gồm đang đăng và đang ẩn; không tính bài trong thùng rác. Bài hết hạn vẫn thuộc tổng này, chỉ bị chuyển sang ẩn theo cơ chế hết hạn.

Frontend tải lại thống kê khi chuyển trang admin, khi quay lại tab, mỗi 30 giây khi tab đang hiển thị và sau các callback thêm/sửa/xóa/khôi phục nhân viên, bài viết. Danh sách nhân viên cũng được tải lại sau thêm/sửa/xóa để pagination và tổng danh sách không giữ số cũ.

Phản hồi cũ hoặc đã bị hủy không ghi đè kết quả mới. Nếu tải lỗi, giữ số liệu gần nhất và hiện nút thử lại; nếu chưa có lần tải thành công thì hiện `—`, không thay bằng số dòng của trang danh sách. Số 0 thật vẫn hiển thị 0.

Kiểm tra backend trong `backend/tests/dashboard.service.test.ts`: bộ lọc loại thùng rác, tổng 0, phòng có nhân viên và loại bỏ giá trị rỗng/trùng khoảng trắng. Kiểm tra trình duyệt dùng API mô phỏng cho đồng bộ card/sidebar, focus/poll/chuyển trang, phản hồi đảo thứ tự, lỗi lần đầu/lỗi cập nhật và retry.
