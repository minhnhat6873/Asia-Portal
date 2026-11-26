import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  requireAdminAuth,
  requireAdminRole,
  requirePermissions,
} from "../middlewares/auth.middleware";
import adminAuthRouter from "./admin/auth.route";
import adminAuditLogRouter from "./admin/audit-log.route";
import adminDashboardRouter from "./admin/dashboard.route";
import adminAccountRouter from "./admin/account.route";
import adminEmployeeRouter from "./admin/employee.route";
import adminPermissionGroupRouter from "./admin/permission-group.route";
import healthRouter from "./health.route";
import userEmployeeRouter from "./user/employee.route";
import adminMediaRouter from "./admin/media.route";
import userMediaRouter from "./user/media.route";
import userMeetingRouter from "./user/meeting.route";
import adminMeetingRouter from "./admin/meeting.route";
import adminSiteSettingsRouter from "./admin/site-settings.route";
import publicSiteSettingsRouter from "./user/site-settings.route";
import { securityConfig } from "../config/security.config";

import userFeedbackRouter from "./user/feedback.route";
import adminFeedbackRouter from "./admin/feedback.route";
import userAuthRouter from "./user/auth.route";
import userAccountRouter from "./user/account.route";
import userNotificationRouter from "./user/notification.route";
import userVehicleRouter from "./user/vehicle.route";
import adminVehicleRouter from "./admin/vehicle.route";
import adminNotificationRouter from "./admin/notification.route";

const router = Router();

const authenticatedAdminLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.authenticatedRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.admin!.id}`,
  message: {
    success: false,
    message: "Bạn đã gửi quá nhiều yêu cầu quản trị, vui lòng thử lại sau.",
  },
});

router.use("/health", healthRouter);
router.use("/user/auth", userAuthRouter);
// The whole portal is internal: every /user router except auth and site-settings (read by
// the login screen) requires a signed-in account (requireUserAuth inside each router).
router.use("/user/account", userAccountRouter);
router.use("/user/notifications", userNotificationRouter);
router.use("/user/vehicles", userVehicleRouter);
router.use("/user/feedback", userFeedbackRouter);
router.use("/user/employees", userEmployeeRouter);
router.use("/user/media", userMediaRouter);
router.use("/user/meetings", userMeetingRouter);
router.use("/user/site-settings", publicSiteSettingsRouter);
router.use("/admin/auth", adminAuthRouter);
// Tất cả API /admin còn lại đều phải đi qua một cổng xác thực chung.
router.use("/admin", requireAdminAuth, authenticatedAdminLimiter);
router.use("/admin/feedback", adminFeedbackRouter);
router.use("/admin/notifications", adminNotificationRouter);
// HR manages vehicle requests; deleting a trip for good needs "vehicles:delete" as well.
router.use("/admin/vehicles", requirePermissions("vehicles:manage"), adminVehicleRouter);
router.use("/admin/dashboard", adminDashboardRouter);
router.use("/admin/site-settings", adminSiteSettingsRouter);
router.use("/admin/employees", adminEmployeeRouter);
router.use("/admin/media", adminMediaRouter);
router.use("/admin/meetings", adminMeetingRouter);
router.use("/admin/audit-logs", requireAdminRole("admin"), adminAuditLogRouter);
// Admin gốc has every permission. A manager needs "accounts:manage-users"; the account
// service then limits that manager to accounts with the user role.
router.use(
  "/admin/accounts",
  requirePermissions("accounts:manage-users"),
  adminAccountRouter,
);
router.use(
  "/admin/permission-groups",
  requireAdminRole("admin"),
  adminPermissionGroupRouter,
);

export default router;
