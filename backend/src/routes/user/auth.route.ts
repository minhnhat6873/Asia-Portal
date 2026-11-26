import { Router, type RequestHandler } from "express";
import { isUserRegistrationEnabled } from "../../config/auth.config";
import rateLimit from "express-rate-limit";
import { currentUser, loginUser, logoutUser, refreshUser, userOtpAction } from "../../controllers/user/auth.controller";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { userEmailOnlySchema, userLoginSchema, userRegisterSchema, userResetSchema, userVerifySchema } from "../../validates/user/auth.validate";
import { securityConfig } from "../../config/security.config";
const router = Router();
const limiter = (limit: number, skipSuccessfulRequests = false) => rateLimit({ windowMs: securityConfig.rateLimitWindowMs, limit, skipSuccessfulRequests,
  standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." } });
// Per machine; each account also has its own wrong-password rule (login-guard.service.ts).
const loginLimit = limiter(securityConfig.loginRateLimitMax, true);
const otpLimit = limiter(20);
router.use((_request, response, next) => { response.setHeader("Cache-Control", "no-store"); next(); });
router.use(requireCsrfProtection);
router.post("/login", loginLimit, validateBody(userLoginSchema), loginUser);
// Disabled self-registration answers like a route that does not exist.
const registrationEnabled: RequestHandler = (_request, response, next) => {
  if (isUserRegistrationEnabled()) { next(); return; }
  response.status(404).json({ success: false, message: "Không tìm thấy API" });
};
router.post("/register", registrationEnabled, otpLimit, validateBody(userRegisterSchema), userOtpAction("register", "start"));
router.post("/register/verify-otp", registrationEnabled, otpLimit, validateBody(userVerifySchema), userOtpAction("register", "verify"));
router.post("/register/resend-otp", registrationEnabled, otpLimit, validateBody(userEmailOnlySchema), userOtpAction("register", "resend"));
router.post("/forgot-password", otpLimit, validateBody(userEmailOnlySchema), userOtpAction("reset", "start"));
router.post("/forgot-password/verify-otp", otpLimit, validateBody(userVerifySchema), userOtpAction("reset", "verify"));
router.post("/forgot-password/resend-otp", otpLimit, validateBody(userEmailOnlySchema), userOtpAction("reset", "resend"));
router.post("/forgot-password/reset", otpLimit, validateBody(userResetSchema), userOtpAction("reset", "reset"));
router.post("/refresh", limiter(securityConfig.refreshRateLimitMax), refreshUser);
router.post("/logout", limiter(60), logoutUser);
router.get("/me", limiter(securityConfig.authenticatedRateLimitMax), currentUser);
export default router;
