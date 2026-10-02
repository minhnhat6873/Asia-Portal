import { Router } from "express";

import {
  requireAdminAuth,
  requireAdminRole,
} from "../middlewares/auth.middleware";
import adminAuthRouter from "./admin/auth.route";
import adminAccountRouter from "./admin/account.route";
import adminEmployeeRouter from "./admin/employee.route";
import adminPermissionGroupRouter from "./admin/permission-group.route";
import healthRouter from "./health.route";
import userEmployeeRouter from "./user/employee.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/user/employees", userEmployeeRouter);
router.use("/admin/auth", adminAuthRouter);
// Tất cả API /admin còn lại đều phải đi qua một cổng xác thực chung.
router.use("/admin", requireAdminAuth);
router.use("/admin/employees", adminEmployeeRouter);
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
