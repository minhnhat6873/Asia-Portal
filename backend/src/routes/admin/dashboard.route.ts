import { Router } from "express";

import { getDashboardSummary } from "../../controllers/admin/dashboard.controller";
import { requirePermissions } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/summary", requirePermissions("dashboard:view"), getDashboardSummary);

export default router;
