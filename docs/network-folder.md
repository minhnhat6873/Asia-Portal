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

- `frontend/src/config/networkFolder.ts`: đường dẫn hiển thị, URI và URL tải cấu hình.
- `frontend/src/features/resources/NetworkFolderCard.tsx`: nút mở, hướng dẫn lần đầu, tải file và sao chép thủ công.
- `frontend/public/downloads/Cai-dat-mo-thu-muc.reg`: cấu hình cho user hiện tại; UTF-16LE của lệnh REG_EXPAND_SZ được biểu diễn bằng `hex(2)` trong file registry dạng ASCII.
- `frontend/public/downloads/Go-cai-dat-mo-thu-muc.reg`: gỡ duy nhất key `asia-folder` của user hiện tại. Không xóa tài liệu hay đổi quyền Windows.

Khi đổi địa chỉ share, cần đồng bộ config frontend và lệnh trong file `.reg`, rồi triển khai lại registry cho các user đã cài. Chỉ thay link web không cập nhật được lệnh đã đăng ký trên Windows.

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
