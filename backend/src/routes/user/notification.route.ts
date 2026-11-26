import { Router } from "express";

import {
  deleteAllNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotifications,
} from "../../controllers/user/notification.controller";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { notificationListQuerySchema } from "../../validates/user/notification.validate";
import { openNotificationStream } from "../../utils/notification/notificationEvents";

const router = Router();
router.use((_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });
router.use(requireUserAuth, requireCsrfProtection);

router.get("/", validateQuery(notificationListQuerySchema), listNotifications);
router.delete("/", deleteAllNotifications);
router.get("/unread-count", unreadNotifications);
// Live signal for new notifications (Server-Sent Events; see utils/notification/notificationEvents.ts).
router.get("/stream", (request, response) => openNotificationStream(request, response, request.user!.id));
router.post("/read-all", markAllNotificationsRead);
router.post("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);

export default router;
