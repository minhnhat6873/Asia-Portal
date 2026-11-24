import { Router } from "express";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotifications,
} from "../../controllers/user/notification.controller";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { notificationListQuerySchema } from "../../validates/user/notification.validate";

const router = Router();
router.use((_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });
router.use(requireUserAuth, requireCsrfProtection);

router.get("/", validateQuery(notificationListQuerySchema), listNotifications);
router.get("/unread-count", unreadNotifications);
router.post("/read-all", markAllNotificationsRead);
router.post("/:id/read", markNotificationRead);

export default router;
