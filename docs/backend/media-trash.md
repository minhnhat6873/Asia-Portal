# Thùng rác truyền thông

## API và quyền

| API | Quyền | Hành vi |
| --- | --- | --- |
| `DELETE /admin/media/:id` | `media:delete` | Xóa mềm, chuyển sang draft, lưu ngày và người xóa từ phiên đăng nhập. |
| `GET /admin/media/trash` | `media:trash` | Tìm theo tiêu đề/Sapo, phân trang, chỉ trả bài đã xóa; mặc định mới xóa trước. |
| `POST /admin/media/:id/restore` | `media:trash` | Chỉ khôi phục bài trong thùng rác, luôn về draft. Body chỉ nhận `{}` hoặc bỏ trống. |
| `DELETE /admin/media/:id/permanent` | `media:trash` | Chỉ xóa vĩnh viễn bài trong thùng rác. |

Mọi endpoint đi qua cổng xác thực admin chung. Quyền được nạp lại từ tài khoản/nhóm active ở mỗi request. `media:delete` không có quyền xem, khôi phục hay xóa vĩnh viễn trong thùng rác. `media:trash` không tự cấp `media:publish`, `media:update` hay quyền xóa mềm.

Trang `/admin/media/trash` có tìm kiếm, phân trang, ngày/người xóa, xác nhận khôi phục và xác nhận xóa vĩnh viễn. Admin gốc có quyền mới tự động. Nhóm quản lý cũ cần được cấp thêm **Quản lý thùng rác truyền thông** trong module Truyền thông. Tài khoản chỉ có quyền thùng rác cũng có đường vào từ sidebar/trang mặc định.

## Quy tắc dữ liệu

- Xóa mềm giữ nội dung, ảnh bìa và tham chiếu ảnh trong nội dung. Không có thời hạn tự xóa khỏi thùng rác.
- Khôi phục giữ nguyên thời hạn và nội dung, xóa metadata xóa mềm, đặt `status: draft`. Muốn đăng lại phải có quyền đăng và thời hạn hợp lệ hoặc chọn đăng vĩnh viễn.
- Điều kiện `isDeleted` nằm ngay trong thao tác MongoDB: restore/xóa vĩnh viễn yêu cầu true; sửa/xóa mềm yêu cầu khác true. Request lặp hoặc request thua thao tác đồng thời trả 404, không được áp dụng lên trạng thái đã đổi.
- Public loại bài đã xóa khỏi danh sách, tìm kiếm, số lượng và URL chi tiết; không trả metadata xóa hay ID ảnh nội bộ.
- Audit có `media.soft_deleted`, `media.restored`, `media.permanently_deleted`, với actor lấy từ phiên đã xác thực.
- Ảnh nội dung trong thùng rác vẫn được tính là đang tham chiếu, nên job dọn ảnh không được xóa chúng. Sau xóa vĩnh viễn, ảnh nội dung theo cơ chế reconciliation/retention hiện tại.
- Ảnh bìa chỉ được dọn bằng `coverImagePublicId` do server ghi nhận trong thư mục `asia-portal/media/`, không suy ra ID từ URL client gửi. Kiểm tra bài khác, kể cả trong thùng rác, còn tham chiếu ảnh trước khi dọn.

Các bài đã bị xóa cứng trước thay đổi này không thể khôi phục từ thùng rác; cần backup có sẵn.

## Kiểm tra và giới hạn

Kiểm thử HTTP dùng router/cổng xác thực thật, JWT và repository tài khoản/nhóm mô phỏng; kiểm tra 401/403, quyền độc lập, thu hồi quyền, tài khoản khóa, giả mạo actor/body và query injection. Kiểm thử repository xác nhận điều kiện nguyên tử và bộ lọc public; kiểm thử service xác nhận giữ ảnh, khôi phục draft và dọn ảnh có giới hạn.

Không phải kiểm thử xâm nhập toàn bộ hạ tầng. Việc ghi audit và dọn Cloudinary vẫn theo cơ chế best effort của dự án: lỗi ghi log/dọn ảnh được ghi nhận để xử lý, không đảo ngược thao tác MongoDB đã thành công. Kiểm tra tham chiếu ảnh bìa giữa các bài và lệnh xóa Cloudinary không nằm trong cùng transaction; không cam kết tuyệt đối với mọi tình huống hạ tầng lỗi hoặc dùng chung ảnh đồng thời.
