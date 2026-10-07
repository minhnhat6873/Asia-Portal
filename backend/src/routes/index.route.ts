import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  requireAdminAuth,
  requireAdminRole,
} from "../middlewares/auth.middleware";
import adminAuthRouter from "./admin/auth.route";
import adminAuditLogRouter from "./admin/audit-log.route";
import adminDashboardRouter from "./admin/dashboard.route";
import adminAccountRouter from "./admin/account.route";
import adminEmployeeRouter from "./admin/employee.route";
import adminPermissionGroupRouter from "./admin/permission-group.route";
import healthRouter from "./health.route";
import userEmployeeRouter from "./user/employee.route";
import { securityConfig } from "../config/security.config";

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
router.use("/user/employees", userEmployeeRouter);
router.use("/admin/auth", adminAuthRouter);
// Tất cả API /admin còn lại đều phải đi qua một cổng xác thực chung.
router.use("/admin", requireAdminAuth, authenticatedAdminLimiter);
router.use("/admin/dashboard", adminDashboardRouter);
router.use("/admin/employees", adminEmployeeRouter);
router.use("/admin/audit-logs", requireAdminRole("admin"), adminAuditLogRouter);
router.use(
  "/admin/accounts",
  requireAdminRole("admin"),
  adminAccountRouter,
);
router.use(
  "/admin/permission-groups",
  requireAdminRole("admin"),
  adminPermissionGroupRouter,
);

export default router;
