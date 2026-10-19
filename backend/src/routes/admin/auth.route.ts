import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  changePassword,
  changeEmail,
  requestEmailChangeOtp,
  resendEmailChangeOtp,
  requestPasswordChangeOtp,
  resendPasswordChangeOtp,
  getCurrentAccount,
  login,
  logout,
  refreshLogin,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "../../controllers/admin/auth.controller";
import { requireAdminAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { securityConfig } from "../../config/security.config";
import {
  changePasswordSchema,
  changeEmailSchema,
  requestEmailChangeOtpSchema,
  resendEmailChangeOtpSchema,
  requestPasswordChangeOtpSchema,
  resendPasswordChangeOtpSchema,
  loginSchema,
  requestPasswordResetOtpSchema,
  resetPasswordWithOtpSchema,
  verifyPasswordResetOtpSchema,
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
router.post("/forgot-password", registerLimiter, validateBody(requestPasswordResetOtpSchema), requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", registerLimiter, validateBody(verifyPasswordResetOtpSchema), verifyPasswordResetOtp);
router.post("/forgot-password/reset", registerLimiter, validateBody(resetPasswordWithOtpSchema), resetPasswordWithOtp);
router.post("/forgot-password/resend-otp", registerLimiter, validateBody(requestPasswordResetOtpSchema), resendPasswordResetOtp);

router.post("/refresh", refreshLimiter, refreshLogin);
router.post("/logout", logout);
const passwordOtpSendLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs, limit: 10,
  standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (request) => `password-otp:${request.admin!.id}`,
  message: { success: false, message: "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau." },
});
const passwordOtpVerifyLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs, limit: 30,
  standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (request) => `password-verify:${request.admin!.id}`,
  message: { success: false, message: "Bạn đã xác nhận OTP quá nhiều lần. Vui lòng thử lại sau." },
});
router.post("/password/request-otp", requireAdminAuth, passwordOtpSendLimiter, validateBody(requestPasswordChangeOtpSchema), requestPasswordChangeOtp);
router.post("/password/resend-otp", requireAdminAuth, passwordOtpSendLimiter, validateBody(resendPasswordChangeOtpSchema), resendPasswordChangeOtp);
router.patch("/password", requireAdminAuth, passwordOtpVerifyLimiter, validateBody(changePasswordSchema), changePassword);
const emailOtpSendLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs, limit: 10,
  standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (request) => `email-otp:${request.admin!.id}`,
  message: { success: false, message: "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau." },
});
const emailOtpVerifyLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs, limit: 30,
  standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (request) => `email-verify:${request.admin!.id}`,
  message: { success: false, message: "Bạn đã xác nhận OTP quá nhiều lần. Vui lòng thử lại sau." },
});
router.post("/email/request-otp", requireAdminAuth, emailOtpSendLimiter, validateBody(requestEmailChangeOtpSchema), requestEmailChangeOtp);
router.post("/email/resend-otp", requireAdminAuth, emailOtpSendLimiter, validateBody(resendEmailChangeOtpSchema), resendEmailChangeOtp);
router.patch("/email", requireAdminAuth, emailOtpVerifyLimiter, validateBody(changeEmailSchema), changeEmail);
router.get("/me", requireAdminAuth, sessionLimiter, getCurrentAccount);

export default router;
