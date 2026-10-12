import { Router } from "express";
import { requirePermissions } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import { createMeeting, deleteMeeting, getMeeting, listMeetingRequests, listMeetings, meetingSummary, revokeMeetingRequest, updateMeeting } from "../../controllers/admin/meeting.controller";
import { adminCreateMeetingSchema, adminMeetingQuerySchema, adminUpdateMeetingSchema, meetingRequestQuerySchema } from "../../validates/admin/meeting.validate";

// requireAdminAuth and the authenticated limiter run at the /admin mount.
const router = Router();
router.get("/", requirePermissions("meetings:view"), validateQuery(adminMeetingQuerySchema), listMeetings);
router.get("/summary", requirePermissions("meetings:view"), validateQuery(adminMeetingQuerySchema), meetingSummary);
router.get("/pending", requirePermissions("meetings:view"), validateQuery(meetingRequestQuerySchema), listMeetingRequests("pending"));
router.get("/cancel-requests", requirePermissions("meetings:view"), validateQuery(meetingRequestQuerySchema), listMeetingRequests("cancel"));
router.delete("/pending/:id", requirePermissions("meetings:delete"), revokeMeetingRequest("pending"));
router.delete("/cancel-requests/:bookingId", requirePermissions("meetings:delete"), revokeMeetingRequest("cancel"));
router.get("/:id", requirePermissions("meetings:view"), getMeeting);
router.post("/", requirePermissions("meetings:create"), validateBody(adminCreateMeetingSchema), createMeeting);
router.patch("/:id", requirePermissions("meetings:update"), validateBody(adminUpdateMeetingSchema), updateMeeting);
router.delete("/:id", requirePermissions("meetings:delete"), deleteMeeting);
export default router;
