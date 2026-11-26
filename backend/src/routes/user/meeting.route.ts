import { Router } from "express";
import rateLimit from "express-rate-limit";

import { bookMeeting, cancelMyBooking, getBookings, getMyBookings } from "../../controllers/user/meeting.controller";
import { securityConfig } from "../../config/security.config";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import { bookMeetingSchema, meetingBookingListQuerySchema } from "../../validates/user/meeting.validate";

const router = Router();

// Meeting schedules are internal: only signed-in accounts can see or book rooms.
router.use(requireUserAuth, requireCsrfProtection, (_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: securityConfig.meetingOtpRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.user!.id}`,
  message: { success: false, message: "Bạn đã gửi quá nhiều yêu cầu đặt phòng, vui lòng thử lại sau." },
});

router.get("/", validateQuery(meetingBookingListQuerySchema), getBookings);
router.get("/mine", getMyBookings);
router.post("/bookings", bookingLimiter, validateBody(bookMeetingSchema), bookMeeting);
router.post("/bookings/:id/cancel", bookingLimiter, cancelMyBooking);

export default router;
