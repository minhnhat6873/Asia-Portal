import { Router } from "express";
import rateLimit from "express-rate-limit";
import { securityConfig } from "../../config/security.config";
import { validateBody } from "../../middlewares/validate.middleware";
import { createFeedback } from "../../controllers/user/feedback.controller";
import { createFeedbackSchema } from "../../validates/user/feedback.validate";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
const router = Router();
// Only signed-in accounts can send feedback (no spam from the Internet).
router.post("/", requireUserAuth, requireCsrfProtection, rateLimit({ windowMs: 15 * 60 * 1000, limit: securityConfig.feedbackRateLimitMax, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Bạn đã gửi quá nhiều ý kiến, vui lòng thử lại sau." } }), validateBody(createFeedbackSchema), createFeedback);
export default router;
