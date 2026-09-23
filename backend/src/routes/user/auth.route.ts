import { Router } from "express";
import rateLimit from "express-rate-limit";

import { register } from "../../controllers/user/auth.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import { securityConfig } from "../../config/security.config";
import { registerAccountSchema } from "../../validates/user/auth.validate";

const router = Router();

const registerLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Đăng ký quá nhiều lần, vui lòng thử lại sau 15 phút",
  },
});

// POST /user/auth/register - Tạo tài khoản user ở trạng thái pending.
router.post("/register", registerLimiter, validateBody(registerAccountSchema), register);

export default router;
