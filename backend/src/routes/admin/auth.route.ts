import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getCurrentAccount,
  login,
  logout,
} from "../../controllers/admin/auth.controller";
import { requireAdminAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { securityConfig } from "../../config/security.config";
import { loginSchema } from "../../validates/admin/auth.validate";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút",
  },
});

router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAdminAuth, getCurrentAccount);

export default router;
