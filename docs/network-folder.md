# Mở thư mục mạng từ Chrome

## Cách dùng

Thẻ **Sổ tay & Tài liệu nội bộ** tại trang chủ mở thư mục `\\192.168.16.10\data\Chung` trong Windows File Explorer. Đây là mở thư mục SMB bằng tài khoản Windows hiện tại, không phải upload/download PDF qua backend.

1. Bấm **Cài đặt lần đầu / Chưa mở được?** trên thẻ.
2. Tải `Cai-dat-mo-thu-muc.reg`, mở file và chấp nhận các hộp thoại xác nhận của Windows. Nếu chính sách máy yêu cầu quyền cao hơn hoặc chặn Registry Editor, IT cần triển khai thay người dùng.
3. Quay lại website và bấm **Mở thư mục tài liệu**. Chấp nhận hộp thoại mở ứng dụng của Chrome nếu xuất hiện.

Chỉ cấu hình một lần cho mỗi tài khoản Windows; nếu chuyển sang Windows user khác thì user đó cần được cấu hình. Máy cần kết nối mạng công ty/VPN và tài khoản domain phải có quyền trên share/NTFS. Việc join domain không tự cấp quyền trên thư mục.

Nếu chưa cấu hình được, sao chép đường dẫn trong hộp hướng dẫn, nhấn **Windows + R**, dán rồi Enter. Trên website HTTP dùng IP nội bộ, Clipboard API có thể không khả dụng; khi đó giao diện chọn sẵn đường dẫn để người dùng Ctrl + C thủ công.

## Cơ chế và phạm vi cấu hình

- Link web: `asia-folder://chung/`, dùng thẻ `a` thường để trình duyệt gọi ứng dụng ngoài khi người dùng bấm, không dùng Next router hoặc `file://`.
- Registry hiện tại của người dùng: `HKEY_CURRENT_USER\Software\Classes\asia-folder`.
- Giá trị `URL Protocol` là chuỗi rỗng.
- Giá trị mặc định tại `shell\open\command` có kiểu **REG_EXPAND_SZ**, với nội dung đã giải mã:

  ```text
  "%SystemRoot%\explorer.exe" "\\192.168.16.10\data\Chung"
  ```

`%SystemRoot%` được Windows mở rộng để dùng đúng Explorer của máy. Chuỗi lệnh không có `%1`, không chạy qua cmd/PowerShell và không chuyển bất kỳ phần nào của URI vào lệnh. Mọi link của scheme này chỉ mở cùng một thư mục đã cấu hình. Registry không chứa username/password; backend không đọc file SMB bằng tài khoản dịch vụ và không thay đổi quyền share/NTFS.

Website không đọc được registry hay xác nhận File Explorer mở thành công, nên không đánh dấu "đã cài" bằng localStorage và không báo giả thành công. Chrome có thể hiện hộp hỏi mở ứng dụng; việc tải `.reg`/import registry có thể bị chính sách công ty chặn. Tính năng mở Explorer dành cho Windows; người dùng hệ điều hành khác không sử dụng file registry này.

## Các tệp liên quan

- `frontend/.env`: cấu hình `NEXT_PUBLIC_NETWORK_FOLDER_PATH`; không commit file này.
- `frontend/src/config/networkFolder.ts`: đọc đường dẫn từ biến môi trường, URI và URL tải cấu hình.
- `frontend/src/features/resources/NetworkFolderCard.tsx`: nút mở, hướng dẫn lần đầu, tải file và sao chép thủ công.
- `frontend/src/app/downloads/Cai-dat-mo-thu-muc.reg/route.ts`: tạo file cài đặt từ cùng cấu hình tại URL `/downloads/Cai-dat-mo-thu-muc.reg`. Không còn bản cài đặt cố định trong `public`.
- `frontend/src/lib/networkFolderPath.ts`, `networkFolderRegistry.ts`: kiểm tra đường dẫn UNC và tạo UTF-16LE của lệnh REG_EXPAND_SZ dưới dạng `hex(2)` trong file registry ASCII/CRLF, kể cả đường dẫn chứa tiếng Việt.
- `frontend/public/downloads/Go-cai-dat-mo-thu-muc.reg`: gỡ duy nhất key `asia-folder` của user hiện tại. Không xóa tài liệu hay đổi quyền Windows.

## Cấu hình đường dẫn bằng môi trường

Đặt biến trong `frontend/.env` (không đặt trong `frontend/src` hay `.env` của backend):

```dotenv
NEXT_PUBLIC_NETWORK_FOLDER_PATH=\\192.168.16.10\data\Chung
```

Không cần khai báo tên miền website: URL tải bắt đầu bằng `/downloads/` nên tự theo origin đang truy cập. URI `asia-folder://chung/` giữ nguyên. Biến `NEXT_PUBLIC_*` được chốt lúc build và có thể đọc được từ trình duyệt, không dùng để chứa mật khẩu. Nếu không khai báo biến, đường dẫn mặc định là `\\192.168.16.10\data\Chung` để tương thích bản cũ. Đường dẫn phải là UNC hợp lệ; cấu hình rỗng, dấu nháy, ký tự điều khiển, `%` hoặc các ký tự cấm của Windows sẽ bị từ chối, không tạo lệnh Registry từ cấu hình đó.

Khi đổi địa chỉ share, chỉ sửa biến này rồi khởi động lại `yarn dev`, hoặc build và triển khai lại frontend trên production. Giao diện và file tải xuống cùng dùng đường dẫn đã cấu hình; không nhận đường dẫn tùy ý từ query/URI. User đã cài cần tải và chạy lại file cài đặt mới (hoặc IT triển khai lại bằng GPO). Chỉ đổi tên miền website không cần cài lại registry, trừ khi IT đã cấu hình policy Chrome riêng theo origin. Đổi `.env` lúc chạy bản production mà không build lại sẽ không cập nhật biến `NEXT_PUBLIC_*`.

## Triển khai domain/GPO

IT có thể triển khai các giá trị HKCU tương ứng bằng **Group Policy Preferences → User Configuration → Preferences → Windows Settings → Registry**. Key `shell\open\command` cần đúng kiểu `REG_EXPAND_SZ`, với lệnh cố định ở trên. Đây là cấu hình theo user, không phải chỉ chạy file một lần bằng tài khoản Administrator trên mỗi máy.

Hoặc đặt file `.reg` đã duyệt trong vị trí phân phối script của domain, dùng user logon script gọi `reg.exe import` với đường dẫn đến file đó. Người dùng nhận cấu hình khi policy/logon script chạy. Không cần cài ứng dụng thực thi riêng.

Không tự tắt hộp xác nhận của Chrome hoặc thay policy trình duyệt trong file cài đặt. Sau khi có địa chỉ website chính thức, IT có thể đánh giá policy Chrome `AutoLaunchProtocolsFromOrigins` cho đúng origin nội bộ và protocol `asia-folder` nếu muốn giảm hộp hỏi.

## Kiểm tra trên máy nhân viên

1. Đăng nhập bằng user domain thật. Dán `\\192.168.16.10\data\Chung` vào File Explorer và xác nhận quyền truy cập.
2. Cài file `.reg` bằng chính user đó hoặc chờ GPO cấp cấu hình.
3. Truy cập website local/nội bộ bằng Chrome; bấm mở thư mục, chấp nhận hộp hỏi và kiểm tra Explorer trỏ đúng thư mục.
4. Đổi user hoặc thử một user không được cấp quyền: tính năng không vượt qua quyền truy cập Windows.
5. Khi cần gỡ, import `Go-cai-dat-mo-thu-muc.reg` bằng cùng Windows user.

Kiểm thử tự động chỉ có thể xác nhận UI, file tải xuống và nội dung registry. Mở share thật và quyền domain cần kiểm tra trong mạng công ty; không suy ra thành công chỉ từ việc bấm link hoặc hiện hộp hỏi Chrome.

## Tham khảo

- [Microsoft: đăng ký ứng dụng xử lý URI](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa767914(v=vs.85)).
- [Chrome: AutoLaunchProtocolsFromOrigins](https://chromeenterprise.google/policies/auto-launch-protocols-from-origins/).
