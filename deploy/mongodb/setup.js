// Chạy một lần sau khi container mongodb bật lần đầu; chạy lại cũng an toàn.
// Khởi tạo replica set 1 node (website cần transaction) và tạo tài khoản riêng cho backend.
const REPLICA_SET_NOT_INITIALIZED = 94;
const appDatabase = process.env.APP_DB_NAME;
const appPassword = process.env.APP_DB_PASSWORD;
if (!appDatabase || !appPassword) throw new Error("Thiếu APP_DB_NAME hoặc APP_DB_PASSWORD trong deploy/mongodb/.env");

try {
  rs.status();
  print("Replica set đã được khởi tạo từ trước.");
} catch (error) {
  if (error.code !== REPLICA_SET_NOT_INITIALIZED) throw error;
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] });
  print("Đã khởi tạo replica set rs0.");
}

for (let attempt = 0; !db.hello().isWritablePrimary; attempt += 1) {
  if (attempt >= 60) throw new Error("Node chưa trở thành PRIMARY sau 60 giây.");
  sleep(1000);
}

const admin = db.getSiblingDB("admin");
if (admin.getUser("asia_app")) {
  print("Tài khoản asia_app đã tồn tại.");
} else {
  admin.createUser({
    user: "asia_app",
    pwd: appPassword,
    roles: [{ role: "readWrite", db: appDatabase }],
  });
  print("Đã tạo tài khoản asia_app.");
}
print("HOAN TAT");
