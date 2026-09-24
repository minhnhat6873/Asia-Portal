# Admin Dashboard — Quản lý người dùng & Duyệt tài khoản

> Component: `Asia-Portal/frontend/src/features/access-control/components/UserManagementView.tsx`
> Modal liên quan: `Asia-Portal/frontend/src/features/access-control/components/PendingAccountsModal.tsx`
> State owner: `Asia-Portal/frontend/src/features/access-control/AccessControlTabs.tsx`

## Tổng quan

`UserManagementView` là view chính của tab "Quản lý người dùng" trong module Access Control. View gồm 4 thẻ KPI thống kê, thanh tìm kiếm/bộ lọc và bảng danh sách nhân sự.

## 4 thẻ KPI thống kê

| # | Thẻ | Giá trị | Ghi chú |
|---|-----|---------|---------|
| 1 | Tổng người dùng | `users.length` | Toàn chuỗi cửa hàng |
| 2 | Đang hoạt động | số user `status === 'active'` | Đủ điều kiện đăng nhập |
| 3 | Nhóm quyền áp dụng | `roles.length` | Dòng phụ: số nhóm tự tạo |
| 4 | **Tài khoản chưa duyệt** | số user `status === 'pending'` | Click mở modal duyệt |

Đặc điểm chung của 4 thẻ:

- Toàn bộ nội dung (label, số, dòng phụ) được **căn giữa** (`text-center`), cùng font-size/weight: label `text-xs font-medium`, số `text-2xl font-bold font-mono tabular-nums`, dòng phụ `text-[11px]`.
- Thẻ thứ 4 là `<button>` (các thẻ khác là `<div>`).

## Thẻ "Tài khoản chưa duyệt" — cảnh báo & flow duyệt

### Cảnh báo nhấp nháy cam

- Khi `pendingUsers.length > 0`: thẻ có class `pending-alert` (định nghĩa trong `Asia-Portal/frontend/src/app/globals.css`) — viền + glow màu orange `#f97316` (rgb 249 115 22) nhấp nháy liên tục (animation 1.4s ease-in-out infinite).
- Khi không còn tài khoản chờ duyệt: không áp dụng class, thẻ trở về viền tĩnh `border-slate-800/80`.

### Modal duyệt tài khoản (`PendingAccountsModal`)

Click thẻ mở modal căn giữa màn hình, dùng cùng pattern design system với các modal khác trong module (backdrop `bg-black/75 backdrop-blur-sm`, panel `bg-[#0c121e] border border-slate-700/80 rounded-2xl`, animation `animate-in fade-in zoom-in-95 duration-150`).

Modal có 3 view nội bộ:

1. **list** — Danh sách tài khoản `status === 'pending'`, mỗi dòng có nút **"Duyệt tài khoản"**. Nút X ở header đóng modal được ở mọi thời điểm.
2. **confirm** — Bấm "Duyệt tài khoản" → hỏi: **"Bạn có muốn phân quyền cho tài khoản này không?"**
   - **Có** → chuyển sang view 3.
   - **Không** → duyệt luôn (`onApproveUser(userId)` — không gán quyền), quay về view list.
3. **assign** — View "Phân quyền": chọn nhóm quyền từ danh sách roles, bấm "Lưu phân quyền" → duyệt + gán quyền (`onApproveUser(userId, roleId)`), tự quay về view list để duyệt tiếp các tài khoản còn lại.

### Callback & state

`AccessControlTabs` cung cấp:

```ts
onApproveUser: (userId: string, roleId?: string) => void;
```

- Set `status: 'active'`, nếu có `roleId` thì gán luôn nhóm quyền.
- Ghi audit log (`user_update`) kèm tên tài khoản.

### Model dữ liệu

`User.status` (`features/access-control/types.ts`): `'active' | 'suspended' | 'pending'`.

- Data seed có 2 tài khoản `pending` trong `features/access-control/data/initialData.ts`.
- Bộ lọc trạng thái của bảng có thêm option "Chờ duyệt"; ô trạng thái hiển thị dot cam + text "Chờ duyệt".
