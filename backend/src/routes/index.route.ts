import { Router } from "express";

import { requireAdminAuth } from "../middlewares/auth.middleware";
import adminAuthRouter from "./admin/auth.route";
import adminEmployeeRouter from "./admin/employee.route";
import employeeRouter from "./employee.route";
import healthRouter from "./health.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/employees", employeeRouter);
router.use("/admin/auth", adminAuthRouter);
router.use("/admin/employees", requireAdminAuth, adminEmployeeRouter);

export default router;