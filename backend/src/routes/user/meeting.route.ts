import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getBookings,
  resendBookingRequestOtp,
  resendCancellationRequestOtp,
  startBookingRequest,
  startCancellationRequest,
  verifyBookingRequest,
  verifyCancellationRequest,
} from "../../controllers/user/meeting.controller";
import { securityConfig } from "../../config/security.config";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import {
  createMeetingBookingSchema,
  meetingBookingListQuerySchema,
  resendMeetingBookingOtpSchema,
  resendMeetingCancellationOtpSchema,
  startMeetingCancellationSchema,
  verifyMeetingBookingOtpSchema,
  verifyMeetingCancellationOtpSchema,
} from "../../validates/user/meeting.validate";

const router = Router();
const meetingRateLimitWindowMs = 15 * 60 * 1000;

const meetingOtpLimiter = rateLimit({
  windowMs: meetingRateLimitWindowMs,
  limit: securityConfig.meetingOtpRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Yêu cầu gửi OTP quá nhiều lần, vui lòng thử lại sau." },
});

const meetingVerifyLimiter = rateLimit({
  windowMs: meetingRateLimitWindowMs,
  limit: securityConfig.meetingVerifyRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Yêu cầu xác thực OTP quá nhiều lần, vui lòng thử lại sau." },
});

router.post("/booking-requests", meetingOtpLimiter, validateBody(createMeetingBookingSchema), startBookingRequest);
router.post("/booking-requests/verify-otp", meetingVerifyLimiter, validateBody(verifyMeetingBookingOtpSchema), verifyBookingRequest);
router.post("/booking-requests/resend-otp", meetingOtpLimiter, validateBody(resendMeetingBookingOtpSchema), resendBookingRequestOtp);

router.post("/cancel-requests", meetingOtpLimiter, validateBody(startMeetingCancellationSchema), startCancellationRequest);
router.post("/cancel-requests/verify-otp", meetingVerifyLimiter, validateBody(verifyMeetingCancellationOtpSchema), verifyCancellationRequest);
router.post("/cancel-requests/resend-otp", meetingOtpLimiter, validateBody(resendMeetingCancellationOtpSchema), resendCancellationRequestOtp);

router.get("/", validateQuery(meetingBookingListQuerySchema), getBookings);

export default router;
