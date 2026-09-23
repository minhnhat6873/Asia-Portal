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
import userAuthRouter from "./user/auth.route";
import userEmployeeRouter from "./user/employee.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/user/auth", userAuthRouter);
router.use("/user/employees", userEmployeeRouter);
router.use("/admin/auth", adminAuthRouter);
router.use("/admin/employees", requireAdminAuth, adminEmployeeRouter);
router.use(
  "/admin/accounts",
  requireAdminAuth,
  requireAdminRole("admin"),
  adminAccountRouter,
);
router.use(
  "/admin/permission-groups",
  requireAdminAuth,
  requireAdminRole("admin"),
  adminPermissionGroupRouter,
);

export default router;
