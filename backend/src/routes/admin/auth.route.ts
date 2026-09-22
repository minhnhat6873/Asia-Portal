import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getCurrentAdmin,
  login,
  logout,
} from "../../controllers/auth.controller";
import { requireAdminAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { loginSchema } from "../../validates/auth.validate";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút",
  },
});

// POST /admin/auth/login - Đăng nhập admin hoặc manager.
router.post("/login", loginLimiter, validateBody(loginSchema), login);

// POST /admin/auth/logout - Xóa cookie đăng nhập.
router.post("/logout", logout);

// GET /admin/auth/me - Lấy tài khoản đang đăng nhập.
router.get("/me", requireAdminAuth, getCurrentAdmin);

export default router;