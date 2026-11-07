# MongoDB local trên Ubuntu

Chuyển database từ Atlas về container `mongodb` trên máy ảo Ubuntu. Chạy mọi lệnh tại thư mục dự án trên server. Website vẫn dùng Atlas cho tới bước 5.

## Vì sao cấu hình như vậy

- **`GLIBC_TUNABLES=glibc.pthread.rseq=1`:** Ubuntu 26.04 báo kernel là `7.0.0-xx` dù thực tế là 7.0.14, nên MongoDB từ chối khởi động ([SERVER-136848](https://jira.mongodb.org/browse/SERVER-136848)). Biến này không nằm trong tài liệu chính thức của MongoDB. Đã thử trên server với `mongo:8.0.34`: khởi động, replica set và transaction đều chạy. Xóa biến này khi MongoDB có bản sửa lỗi.
- **Replica set 1 node:** backend dùng transaction ở các luồng mật khẩu, email, tài khoản và nhân viên.
- **Không publish cổng:** chỉ container trong Compose kết nối được MongoDB.

## 1. Kiểm tra volume và tạo secret

Volume phải trống, nếu không MongoDB sẽ không tạo tài khoản root:

```bash
sudo ls -A /var/lib/docker/volumes/asia_portal_mongodb_data/_data | wc -l
```

Nếu kết quả khác `0`, dừng lại và kiểm tra dữ liệu trong volume trước khi làm tiếp.

Tạo keyfile và file mật khẩu. UID 999 là user `mongodb` trong image:

```bash
openssl rand -base64 756 | sudo tee deploy/mongodb/keyfile > /dev/null
sudo chown 999:999 deploy/mongodb/keyfile
sudo chmod 400 deploy/mongodb/keyfile

cp -n deploy/mongodb/.env.example deploy/mongodb/.env
chmod 600 deploy/mongodb/.env
sed -i "s/^MONGO_INITDB_ROOT_PASSWORD=.*/MONGO_INITDB_ROOT_PASSWORD=$(openssl rand -hex 24)/" deploy/mongodb/.env
sed -i "s/^APP_DB_PASSWORD=.*/APP_DB_PASSWORD=$(openssl rand -hex 24)/" deploy/mongodb/.env
```

Xem tên database đang dùng trên Atlas. Lệnh này bỏ phần chứa mật khẩu:

```bash
grep '^DATABASE=' backend/.env | sed 's#.*@##'
```

Tên database là phần nằm sau dấu `/` và trước dấu `?`. Ghi tên đó vào `APP_DB_NAME` trong `deploy/mongodb/.env`. Nếu sau dấu `/` không có tên thì database đang là `test`.

## 2. Bật MongoDB và khởi tạo

Chỉ bật container `mongodb`, chưa đụng tới backend:

```bash
sudo docker compose --env-file frontend/.env up -d mongodb
sudo docker compose --env-file frontend/.env ps mongodb
sudo docker compose --env-file frontend/.env exec mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin /etc/mongo/setup.js'
```

Kết quả phải có dòng `HOAN TAT`. Chạy lại lệnh cuối cũng an toàn.

## 3. Chuyển dữ liệu (website dừng vài phút)

Dừng website để không có dữ liệu mới ghi vào Atlas trong lúc chép:

```bash
sudo docker compose --env-file frontend/.env stop frontend backend
```

Sao lưu Atlas. Lệnh đọc chuỗi kết nối từ `backend/.env` nên mật khẩu không vào lịch sử terminal. Nếu `DATABASE` trong file có dấu nháy, bỏ dấu nháy trước khi chạy:

```bash
mkdir -p ~/mongo-backup
sudo docker run --rm --env-file backend/.env -v "$HOME/mongo-backup:/backup" mongo:8.0.34 sh -c 'mongodump --uri="$DATABASE" --archive=/backup/atlas-cutover.gz --gzip'
```

Nạp vào MongoDB local:

```bash
sudo cat ~/mongo-backup/atlas-cutover.gz | sudo docker compose --env-file frontend/.env exec -T mongodb sh -c 'mongorestore -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop --nsInclude "$APP_DB_NAME.*"'
```

Dòng cuối phải báo `0 document(s) failed to restore`.

## 4. Trỏ backend sang MongoDB local

Giữ lại cấu hình Atlas để quay về khi cần:

```bash
cp backend/.env backend/.env.atlas-backup
chmod 600 backend/.env.atlas-backup
nano backend/.env
```

Đổi `DATABASE`, thay hai giá trị trong dấu `<>` bằng `APP_DB_PASSWORD` và `APP_DB_NAME` trong `deploy/mongodb/.env`:

```dotenv
DATABASE=mongodb://asia_app:<APP_DB_PASSWORD>@mongodb:27017/<APP_DB_NAME>?replicaSet=rs0&authSource=admin
```

## 5. Bật lại website và kiểm tra

```bash
sudo docker compose --env-file frontend/.env up -d --build
sudo docker compose --env-file frontend/.env ps
curl -f http://127.0.0.1:4000/health
```

Bấm thử trên website: đăng nhập admin, xem danh sách nhân viên, đặt phòng họp, sửa nhân viên, đổi mật khẩu. Đổi mật khẩu dùng transaction nên chứng minh được replica set hoạt động với backend.

## Quay lại Atlas khi có sự cố

```bash
cp backend/.env.atlas-backup backend/.env
sudo docker compose --env-file frontend/.env up -d backend
```

Dữ liệu tạo sau bước 3 chỉ nằm ở MongoDB local, không có trên Atlas. Giữ cụm Atlas ít nhất vài tuần sau khi chuyển.

## Sao lưu tự động

Hỏng máy ảo thì mất luôn dữ liệu trong volume, nên `BACKUP_DIR` phải là thư mục ngoài máy ảo, ví dụ ổ mạng đã mount. Thư mục mặc định `/var/backups/asia-portal` vẫn nằm trong máy ảo, chỉ dùng tạm.

Chạy thử:

```bash
sudo BACKUP_DIR=/duong/dan/o-mang bash deploy/mongodb/backup.sh
```

Đặt lịch 1 giờ sáng mỗi ngày bằng `sudo crontab -e`, thay đường dẫn cho đúng:

```cron
0 1 * * * BACKUP_DIR=/duong/dan/o-mang bash /home/itadmin/Asia-Portal/deploy/mongodb/backup.sh >> /var/log/asia-portal-backup.log 2>&1
```

Nên thử khôi phục một bản sao lưu vào container tạm vài tháng một lần, vì bản sao lưu chưa từng thử khôi phục thì chưa chắc dùng được.

Không chạy `docker volume rm asia_portal_mongodb_data`: lệnh này xóa toàn bộ dữ liệu.
