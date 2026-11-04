import { Router } from "express";
import rateLimit from "express-rate-limit";
import { securityConfig } from "../../config/security.config";
import { validateBody } from "../../middlewares/validate.middleware";
import { createFeedback } from "../../controllers/user/feedback.controller";
import { createFeedbackSchema } from "../../validates/user/feedback.validate";
const router = Router();
router.post("/", rateLimit({ windowMs: 15 * 60 * 1000, limit: securityConfig.feedbackRateLimitMax, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Bạn đã gửi quá nhiều ý kiến, vui lòng thử lại sau." } }), validateBody(createFeedbackSchema), createFeedback);
export default router;
