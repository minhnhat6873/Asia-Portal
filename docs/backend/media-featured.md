# Bài đăng nổi bật

Chỉ bài đang hiển thị công khai mới được bật `featured`. Có năm vị trí cố định `featuredSlot` từ 1 đến 5; một vị trí chỉ thuộc một bài. Chọn vị trí đã sử dụng trả 409, không thay đổi bài hiện tại: người dùng phải tự mở bài đang chiếm vị trí và tắt nổi bật. Ẩn bài, tự ẩn do hết hạn hoặc chuyển vào thùng rác giải phóng vị trí; đăng lại hoặc khôi phục không tự bật lại. Form tạo lưu bài dưới dạng ẩn, nên cần đăng bài trước rồi vào sửa để bật nổi bật.

Các thao tác bật và đổi vị trí dùng giao dịch MongoDB và khóa ghi chung để chặn hai yêu cầu đồng thời chiếm một vị trí. MongoDB cần replica set hoặc sharded cluster hỗ trợ transaction; nếu không, yêu cầu bật bị từ chối với HTTP 503. Các thao tác không bật nổi bật vẫn dùng luồng thông thường. Các bài nổi bật cũ chưa có vị trí được ánh xạ tạm ổn định theo thời điểm bật và được lưu vị trí khi có thao tác chọn vị trí thành công.

`GET /admin/media/featured-slots` yêu cầu quyền xem truyền thông và trả danh sách vị trí cùng ID, tiêu đề bài đang dùng. `GET /user/media?featured=true&limit=5` chỉ trả bài nổi bật được phép hiển thị công khai, sắp theo vị trí tăng dần. Trang chủ cho chuyển giữa tối đa năm bài và hiển thị tối đa ba bài cùng lúc; trang truyền thông lấy bài có vị trí nhỏ nhất. Bài hết hạn đã được đăng lại công khai có thể được bật nổi bật lại, nhưng vẫn mang nhãn hết hạn.

Khi chưa có hoặc chưa đủ bài được đánh dấu, hệ thống không tự chọn thêm bài mới nhất làm nổi bật.
