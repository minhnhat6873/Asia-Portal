# Deploy Asia Portal trên Ubuntu nội bộ

## Kiến trúc

Nginx trên Ubuntu nhận HTTP tại IP LAN → frontend Next.js và backend Express trong Docker → MongoDB Atlas. Compose chỉ publish cổng 3000/4000 trên `127.0.0.1`; nhân viên không truy cập trực tiếp các cổng này. Không có container MongoDB và không seed dữ liệu khi khởi động.

Cấu hình mẫu dùng Ubuntu `192.168.17.23` và subnet `192.168.16.0/23`. Thay các giá trị nếu IP thay đổi. Nginx chỉ cho subnet này và loopback; đây không phải danh sách mọi VLAN của công ty. Nếu Wi-Fi khách cùng subnet, quy tắc này cũng cho khách truy cập: cần tách VLAN/ACL hoặc giới hạn nguồn cụ thể theo chính sách công ty.

## 1. Chuẩn bị

- Cài Git, Docker Engine và Compose theo https://docs.docker.com/engine/install/ubuntu/.
- Lấy code đã commit/push về Ubuntu bằng Git. Không copy `node_modules` từ Windows.
- Cho phép IP public chiều ra của Ubuntu trong IP Access List của Atlas. Không nhập IP LAN. IP Internet có thể thay đổi hoặc có nhiều WAN, cần kiểm tra với quản trị mạng.
- Atlas, Cloudinary, SMTP cần kết nối ra ngoài; website nội bộ không có nghĩa là chạy hoàn toàn offline.

## 2. Cấu hình secret trên Ubuntu

Tại thư mục dự án, nếu chưa có `backend/.env`, tạo từ mẫu:

```bash
cp -n backend/.env.example backend/.env
chmod 600 backend/.env
nano backend/.env
```

Nhập riêng trên Ubuntu các giá trị thật đang dùng: `DATABASE` (chuỗi Atlas đầy đủ, đúng database), `JWT_SECRET`, `OTP_SECRET`, các biến `CLOUDINARY_*` và `SMTP_*`. Không gửi qua chat, không commit `.env`. Secret chỉ vào backend runtime, không vào frontend/build args/image.

Đặt các biến triển khai:

```dotenv
NODE_ENV=production
PORT=4000
CORS_ALLOWED_ORIGINS=http://192.168.17.23
DOMAIN_FRONTEND=http://192.168.17.23
AUTH_COOKIE_SECURE=false
TRUST_PROXY_HOPS=1
```

HTTP này chỉ là bước kiểm tra LAN, chưa mã hóa mật khẩu/session trên đường truyền. Trước sử dụng chính thức, cấu hình HTTPS bằng chứng chỉ được máy nhân viên tin cậy; đổi origin sang HTTPS và `AUTH_COOKIE_SECURE=true`. Không cần công khai website lên Internet để có HTTPS (có thể dùng CA nội bộ hoặc domain với DNS challenge).

Compose đọc env theo cú pháp của Docker Compose. Nếu secret có ký tự `$`, dùng giá trị single-quoted để không bị nội suy; mật khẩu trong MongoDB URI phải được URL-encode đúng. Không ghi dấu placeholder hay secret rỗng thay cho dữ liệu thật.

TinyMCE cần public API key nếu dùng trình soạn thảo. Có thể tạo `.env` tại gốc dự án chứa duy nhất `NEXT_PUBLIC_TINYMCE_API_KEY=...` để Compose truyền vào build frontend; đây là public key, không dùng secret backend. Đảm bảo key cho phép origin triển khai.

## 3. Build và chạy ứng dụng

```bash
sudo docker compose config --quiet
sudo docker compose up -d --build
sudo docker compose ps
curl -f http://127.0.0.1:4000/health
curl -I http://127.0.0.1:3000
```

`config --quiet` chỉ validate, không in giá trị secret. Build cần Internet. Backend phải kết nối Atlas thành công thì frontend mới khởi động. Nếu lỗi:

```bash
sudo docker compose logs --tail=80 backend
sudo docker compose logs --tail=80 frontend
```

Không gửi log chứa URI/password/token. Không chạy seed trên Atlas đã có dữ liệu. Container tự khởi động lại trừ khi đã dừng thủ công; healthcheck không tự restart một process còn chạy nhưng unhealthy. Ubuntu cần tắt auto-suspend và giữ mạng ổn định nếu chạy 24/24.

## 4. Nginx trên host

```bash
sudo apt install -y nginx
sudo cp deploy/nginx/asia-portal.conf /etc/nginx/sites-available/asia-portal
sudo ln -s /etc/nginx/sites-available/asia-portal /etc/nginx/sites-enabled/asia-portal
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Nếu file cấu hình/symlink đã có, kiểm tra trước khi ghi đè. Không xóa site của dịch vụ khác. Nếu cổng 80 đang dùng, kiểm tra bằng `sudo ss -ltnp`; không dừng dịch vụ khác tùy tiện. `nginx -t` phải thành công trước khi reload.

Kiểm tra trên Ubuntu rồi trên máy Windows cùng LAN:

```bash
curl -f http://192.168.17.23/backend-api/health
```

Mở `http://192.168.17.23` và `http://192.168.17.23/admin/login`. Máy khác không nên truy cập được `http://192.168.17.23:3000` hay `:4000`.

Kiểm tra `sudo ufw status verbose`. Nếu UFW đang active, cho đúng subnet vào HTTP:

```bash
sudo ufw allow from 192.168.16.0/23 to any port 80 proto tcp
```

Không bật/tắt firewall hoặc thay đổi toàn bộ rule khi chưa biết quyền truy cập SSH/RDP và dịch vụ đang dùng. Không tạo port forwarding/DMZ/tunnel public; kiểm tra cả firewall/router, VPN và IPv6 theo chính sách công ty. Docker published ports có thể bypass UFW, vì vậy các cổng ứng dụng được bind loopback thay vì tất cả interface.

## 5. Cập nhật

```bash
git pull --ff-only
sudo docker compose up -d --build
sudo docker compose ps
```

Không dùng `reset --hard` để xử lý thay đổi local. Thay backend `.env` cần recreate container (`docker compose up -d`), không chỉ restart. Nếu IP LAN đổi, sửa origin backend và `server_name` Nginx, validate/reload Nginx. Backup Atlas và lên kế hoạch rollback trước khi cập nhật production.
