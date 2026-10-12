# API quản trị lịch họp

Tất cả endpoint qua `requireAdminAuth`, limiter quản trị và permission tương ứng. Dùng lại bốn collection meeting hiện có; không tạo dữ liệu demo. Admin không cần OTP.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/meetings` | `meetings:view` |
| GET | `/admin/meetings/summary` | `meetings:view` |
| GET | `/admin/meetings/pending` | `meetings:view` |
| GET | `/admin/meetings/cancel-requests` | `meetings:view` |
| GET | `/admin/meetings/:id` | `meetings:view` |
| POST | `/admin/meetings` | `meetings:create` |
| PATCH | `/admin/meetings/:id` | `meetings:update` |
| DELETE | `/admin/meetings/:id` | `meetings:delete` |
| DELETE | `/admin/meetings/pending/:id` | `meetings:delete` |
| DELETE | `/admin/meetings/cancel-requests/:bookingId` | `meetings:delete` |

Response: `{ success: true, message, data }`. POST trả 201, còn lại 200. Lỗi validation 400, thiếu phiên 401, thiếu quyền 403, không tìm thấy 404, trùng lịch/thay đổi đồng thời/đang archive 409.

## Danh sách và thống kê

Query: `search` (tiêu đề, chủ trì, email, phòng ban; literal substring không phân biệt hoa thường), `department` (khớp chính xác), `roomId`, `dateFrom`, `dateTo` (YYYY-MM-DD, bao gồm hai đầu), `status=upcoming|ongoing|ended`, `source=active|history`, `sort=asc|desc`, `page`, `limit` (tối đa 500; mặc định 20). Sort ngày, giờ bắt đầu rồi ID. Danh sách trả `items` và `pagination: { page, limit, total, totalPages }`.

ID ổn định là `_id` booking gốc hoặc `originalBookingId` trong history, không phải `_id` của bản ghi trash. Mỗi item có `id`, `source`, `status`, các trường nghiệp vụ, `end`, `durationMinutes`, timestamp. Email admin đầy đủ; public vẫn che email.

Summary áp dụng cùng bộ lọc danh sách, bỏ qua page/limit/sort. `total`, `today` (ngày Việt Nam hiện tại), `ongoing`, `ended`, `departmentCount`, `room01`, `room02` tính trên tập active + history chưa hết hạn. Trong giai đoạn archive, deduplicate bằng ID gốc và ưu tiên history. Trạng thái tính từ giờ Asia/Ho_Chi_Minh, không lưu MongoDB. `pendingOtp` là tổng yêu cầu đặt đang còn hạn trên toàn hệ thống, không chịu bộ lọc lịch. `scope` mô tả bộ lọc/thời điểm/timezone. TTL history vẫn là 12 ngày từ lúc họp kết thúc, không cập nhật khi xem/sửa.

## Tạo, sửa và xóa

POST body: `{ title, organizer, email, department, roomId, date, start, durationMinutes, attendees }`. PATCH nhận một hoặc nhiều trường đó. Backend tính `end`, dùng validation chung với public và config phòng/thời gian/nghỉ. Chỉ có room-01 (12 người), room-02 (6 người); email @asiafnb.com.

Lịch upcoming sửa toàn bộ. Lịch ongoing chỉ sửa title/organizer/email/department, không đổi phòng, giờ hoặc số người. Ended/history chỉ đọc hoặc xóa. Update native atomic thay toàn bộ reservationSlots và tăng revision; điều kiện revision, archive claim và thời gian tại lúc ghi chống ghi đè/race. Unique multikey index reservationSlots dùng chung public chặn booking đồng thời; duplicate 11000 trả 409. Update thu hồi OTP hủy cũ. Khi PATCH bị 409, tải lại dữ liệu trước khi thử lại.

DELETE là hard delete; slot tự giải phóng khi document bị xóa và yêu cầu OTP hủy liên quan được dọn. Không đưa lịch admin xóa vào trash. Nếu job đang giữ archive claim, trả 409 để thử lại sau; không xóa cạnh tranh với job. Audit lưu actor, thời gian, ID và before/after phù hợp theo audit service hiện có (best effort), không lưu secret.

## OTP metadata và thu hồi

Hai danh sách request nhận `page`, `limit` (mặc định 20, tối đa 100), sort mới nhất; trả pagination và `expired`. Pending trả ID, thông tin cuộc họp, email, thời điểm tạo/hết hạn. Cancel trả ID, bookingId, email, thời điểm tạo/hết hạn. Projection whitelist ngay trong truy vấn, không đọc/trả otpHash/OTP hoặc các bộ đếm nội bộ.

Thu hồi dùng atomic delete. Public verify đặt phòng phải consume pending atomically trước khi tạo booking, nên request bị thu hồi trước đó không thể dùng snapshot cũ để tạo lịch. Request đã consume được coi là đang hoàn tất và không còn pending để thu hồi. Nếu insert sau consume thất bại, người dùng cần bắt đầu yêu cầu mới; không khôi phục một OTP có thể đã bị thu hồi. Hủy OTP cũng dùng consume hiện có; xóa booking kiểm tra snapshot để không xóa nhầm lịch vừa được admin sửa.

## Kiểm chứng

Không chạy mutation lên production. Smoke check có thể dựng HTTP router với repository mock trong bộ nhớ để kiểm tra CRUD, validation, 409, quyền và audit; kiểm tra unique index/aggregate/job đồng thời cần MongoDB test riêng. Không tạo bộ Jest mới.
