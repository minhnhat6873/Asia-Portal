import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE?.trim();

  if (!databaseUrl) {
    console.warn("Chưa cấu hình DATABASE, server sẽ chạy mà không kết nối MongoDB.");
    return;
  }

  await mongoose.connect(databaseUrl);
  console.log("Kết nối MongoDB thành công.");
}