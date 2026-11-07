#!/usr/bin/env bash
# Sao lưu MongoDB local thành một file nén, giữ lại KEEP_DAYS ngày gần nhất.
# Đặt BACKUP_DIR là thư mục nằm ngoài máy ảo (ổ mạng đã mount) để hỏng máy ảo vẫn còn dữ liệu.
set -euo pipefail

cd "$(dirname "$0")/../.."
BACKUP_DIR="${BACKUP_DIR:-/var/backups/asia-portal}"
KEEP_DAYS="${KEEP_DAYS:-14}"

umask 077
mkdir -p "$BACKUP_DIR"
target="$BACKUP_DIR/asia-portal-$(date +%F-%H%M).gz"

# Ghi ra file tạm trước để một lần sao lưu lỗi không để lại file trông như bản hợp lệ.
docker compose --env-file frontend/.env exec -T mongodb sh -c \
  'mongodump --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$APP_DB_NAME" --archive --gzip' \
  > "$target.tmp"
mv "$target.tmp" "$target"

find "$BACKUP_DIR" -name 'asia-portal-*.gz' -mtime +"$KEEP_DAYS" -delete
echo "Đã sao lưu: $target ($(du -h "$target" | cut -f1))"
