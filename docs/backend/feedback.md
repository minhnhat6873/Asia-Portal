# Đóng góp ý kiến

Model `Feedback` lưu tiêu đề, HTML đã làm sạch, chữ thuần tìm kiếm, danh tính (null khi ẩn danh), trạng thái, ghim, thời gian và thông tin xóa mềm. Có index sắp xếp, trạng thái và text; tìm kiếm danh sách dùng chuỗi không phân biệt chữ hoa thường.

`POST /user/feedback` công khai, tối đa 5 lần/IP/15 phút (cấu hình `FEEDBACK_RATE_LIMIT_MAX`), trả 201 không kèm dữ liệu. Tiêu đề 1–150 ký tự; nội dung sau làm sạch 10–2000 ký tự chữ thuần, HTML tối đa 20000. Tên 2–100 ký tự và email đúng đuôi `@asiafnb.com` bắt buộc khi không ẩn danh. Joi loại các trường không cho phép.

Các API sau yêu cầu đăng nhập và role `admin` (Toàn quyền Admin):

- `GET /admin/feedback?page=1&limit=5&q=...&status=all|pending|seen`: trả `data.items`, `data.pagination`, `data.stats` (thống kê toàn bộ chưa xóa). Ghim trước, mới nhất trước.
- `GET /admin/feedback/:id`: trả chi tiết và chuyển pending sang seen.
- `PATCH /admin/feedback/:id`: nhận `status` và/hoặc `pinned`.
- Khi ghim (`pinned: true`), trạng thái được chuyển sang `seen` trong cùng một lần cập nhật; bỏ ghim giữ nguyên trạng thái.
- `DELETE /admin/feedback/:id`: xóa vĩnh viễn bản ghi chưa xóa; người thực hiện được ghi trong audit log.

Thay đổi trạng thái, ghim và xóa được ghi audit theo cơ chế best-effort hiện có. ID sai trả 400; bản ghi không tồn tại hoặc đã xóa trả 404.
