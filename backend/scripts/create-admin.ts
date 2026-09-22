import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.config";
import { ADMIN_ROLES, type AdminRole } from "../src/interfaces/admin.interface";
import AdminModel from "../src/models/admin.model";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}

async function createInitialAdmin(): Promise<void> {
  const name = getRequiredEnv("SEED_ADMIN_NAME");
  const email = getRequiredEnv("SEED_ADMIN_EMAIL").toLowerCase();
  const password = getRequiredEnv("SEED_ADMIN_PASSWORD");
  const roleValue = (process.env.SEED_ADMIN_ROLE?.trim() || "admin") as AdminRole;

  if (!ADMIN_ROLES.includes(roleValue)) {
    throw new Error("SEED_ADMIN_ROLE chỉ được là admin hoặc manager");
  }

  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD phải có ít nhất 8 ký tự");
  }

  await connectDatabase();

  const existingAccount = await AdminModel.findOne({ email }).lean();
  if (existingAccount) {
    console.log("Tài khoản quản trị với email này đã tồn tại, không tạo thêm.");
    return;
  }

  await AdminModel.create({
    name,
    email,
    password,
    role: roleValue,
    status: "active",
  });

  console.log(`Đã tạo tài khoản ${roleValue} đầu tiên thành công.`);
}

createInitialAdmin()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Không thể tạo tài khoản admin");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });