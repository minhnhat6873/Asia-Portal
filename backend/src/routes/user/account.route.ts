import { Router } from "express";
import rateLimit from "express-rate-limit";

import { changePassword, getProfile, logoutOtherDevices, removeAvatar, uploadAvatar } from "../../controllers/user/account.controller";
import { uploadAccountAvatar } from "../../helpers/multerCloudinary.helper";
import { securityConfig } from "../../config/security.config";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { userChangePasswordSchema } from "../../validates/user/auth.validate";

const router = Router();
router.use((_request, response, next) => { response.setHeader("Cache-Control", "no-store"); next(); });
router.use(requireUserAuth, requireCsrfProtection);

const passwordLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.user!.id}`,
  message: { success: false, message: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau." },
});

router.get("/profile", getProfile);
router.post("/change-password", passwordLimiter, validateBody(userChangePasswordSchema), changePassword);
router.post("/logout-others", logoutOtherDevices);

const avatarLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.user!.id}`,
  message: { success: false, message: "Bạn đã đổi ảnh quá nhiều lần. Vui lòng thử lại sau." },
});
// The person's own picture (multipart field "avatar", JPEG/PNG/WebP up to 5 MB).
router.post("/avatar", avatarLimiter, uploadAccountAvatar.single("avatar"), uploadAvatar);
router.delete("/avatar", avatarLimiter, removeAvatar);

export default router;
