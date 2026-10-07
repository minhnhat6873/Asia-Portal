import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getCurrentAccount,
  login,
  logout,
  refreshLogin,
  register,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  resendRegistrationOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
  verifyRegistrationOtp,
} from "../../controllers/admin/auth.controller";
import { requireAdminAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { securityConfig } from "../../config/security.config";
import {
  loginSchema,
  registerAccountSchema,
  requestPasswordResetOtpSchema,
  resendRegistrationOtpSchema,
  resetPasswordWithOtpSchema,
  verifyPasswordResetOtpSchema,
  verifyRegistrationOtpSchema,
} from "../../validates/admin/auth.validate";

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

const registerLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Yêu cầu xác thực quá nhiều lần, vui lòng thử lại sau 15 phút",
  },
});

const refreshLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.refreshRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Làm mới phiên quá nhiều lần, vui lòng thử lại sau.",
  },
});

const sessionLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.authenticatedRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.admin!.id}`,
  message: {
    success: false,
    message: "Kiểm tra phiên quá nhiều lần, vui lòng thử lại sau.",
  },
});

router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/register", registerLimiter, validateBody(registerAccountSchema), register);
router.post("/register/verify-otp", registerLimiter, validateBody(verifyRegistrationOtpSchema), verifyRegistrationOtp);
router.post("/register/resend-otp", registerLimiter, validateBody(resendRegistrationOtpSchema), resendRegistrationOtp);

router.post("/forgot-password", registerLimiter, validateBody(requestPasswordResetOtpSchema), requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", registerLimiter, validateBody(verifyPasswordResetOtpSchema), verifyPasswordResetOtp);
router.post("/forgot-password/reset", registerLimiter, validateBody(resetPasswordWithOtpSchema), resetPasswordWithOtp);
router.post("/forgot-password/resend-otp", registerLimiter, validateBody(requestPasswordResetOtpSchema), resendPasswordResetOtp);

router.post("/refresh", refreshLimiter, refreshLogin);
router.post("/logout", logout);
router.get("/me", requireAdminAuth, sessionLimiter, getCurrentAccount);

export default router;
