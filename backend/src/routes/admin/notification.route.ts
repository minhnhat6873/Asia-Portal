import { Router } from "express";

import {
  adminUnreadNotifications,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../controllers/admin/notification.controller";
import { validateQuery } from "../../middlewares/validate.middleware";
import { notificationListQuerySchema } from "../../validates/user/notification.validate";
import { openNotificationStream } from "../../utils/notification/notificationEvents";

// Mounted after requireAdminAuth: every admin-portal account sees its own notifications.
const router = Router();
router.get("/", validateQuery(notificationListQuerySchema), listAdminNotifications);
router.get("/unread-count", adminUnreadNotifications);
// Live signal for new notifications (Server-Sent Events; see utils/notification/notificationEvents.ts).
router.get("/stream", (request, response) => openNotificationStream(request, response, request.admin!.id, "admin"));
router.post("/read-all", markAllAdminNotificationsRead);
router.post("/:id/read", markAdminNotificationRead);
export default router;
