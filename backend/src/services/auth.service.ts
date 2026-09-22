import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import type {
  AuthenticatedAdmin,
  LoginInput,
} from "../interfaces/admin.interface";
import { adminRepository } from "../repositories/admin.repository";
import { AppError } from "../utils/errors/AppError";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new AppError(500, "Máy chủ chưa cấu hình JWT_SECRET");
  }
  return secret;
}

export const authService = {
  async login(data: LoginInput) {
    const account = await adminRepository.findActiveByEmailWithPassword(data.email);
    if (!account) {
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }

    const passwordMatches = await bcrypt.compare(data.password, account.password);
    if (!passwordMatches) {
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }

    const admin: AuthenticatedAdmin = {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      role: account.role,
    };

    const token = jwt.sign(
      {
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      getJwtSecret(),
      {
        subject: admin.id,
        expiresIn: "8h",
      },
    );

    return { admin, token };
  },
};