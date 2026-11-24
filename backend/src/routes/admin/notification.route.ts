import { Router } from "express";

import {
  adminUnreadNotifications,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../controllers/admin/notification.controller";
import { validateQuery } from "../../middlewares/validate.middleware";
import { notificationListQuerySchema } from "../../validates/user/notification.validate";

// Mounted after requireAdminAuth: every admin-portal account sees its own notifications.
const router = Router();
router.get("/", validateQuery(notificationListQuerySchema), listAdminNotifications);
router.get("/unread-count", adminUnreadNotifications);
router.post("/read-all", markAllAdminNotificationsRead);
router.post("/:id/read", markAdminNotificationRead);
export default router;
