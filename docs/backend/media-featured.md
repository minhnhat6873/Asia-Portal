# Bài đăng nổi bật

Trang chủ hiện **tối đa 3** tin nổi bật (`MEDIA_FEATURED_LIMIT` trong `backend/src/interfaces/media.interface.ts`). Có ba vị trí cố định `featuredSlot` từ 1 đến 3; một vị trí chỉ thuộc một bài. Khi cả ba vị trí đã có bài, không bật thêm được bài thứ tư: chọn vị trí đã dùng trả 409 và form quản trị khóa ô chọn, người dùng phải mở một bài đang nổi bật và tắt trước.

Chỉ bài đang hiển thị mới được bật `featured`. Ẩn bài, tự ẩn do hết hạn hoặc chuyển vào thùng rác giải phóng vị trí; đăng lại hoặc khôi phục không tự bật lại. Form tạo lưu bài dưới dạng ẩn, nên cần đăng bài trước rồi vào sửa để bật nổi bật.

Các thao tác bật và đổi vị trí dùng giao dịch MongoDB và khóa ghi chung để chặn hai yêu cầu đồng thời chiếm một vị trí. MongoDB cần replica set hoặc sharded cluster hỗ trợ transaction; nếu không, yêu cầu bật bị từ chối với HTTP 503. Bài nổi bật cũ chưa có vị trí được gán tạm vị trí trống theo thời điểm bật. Bài còn giữ vị trí 4 hoặc 5 từ trước được tắt nổi bật khi hệ thống dọn bài hết hạn (mỗi lần mở danh sách quản trị hoặc chạy job).

`GET /admin/media/featured-slots` yêu cầu quyền xem truyền thông và trả các vị trí 1–3 đang dùng cùng ID, tiêu đề bài.

`GET /user/media?featured=true&limit=3` trả tối đa 3 bài: trước hết là bài được chọn nổi bật theo thứ tự vị trí; **nếu chưa chọn đủ hoặc không chọn bài nào, hệ thống lấy các bài mới nhất (theo ngày đăng) bù vào**, không trùng bài đã chọn. Khách chưa đăng nhập chỉ nhận bài công khai, kể cả bài bù. Trang truyền thông lấy bài đầu tiên của danh sách này.
