import { Router } from "express";

import { getAuditLogs } from "../../controllers/admin/audit-log.controller";
import { validateQuery } from "../../middlewares/validate.middleware";
import { auditLogListQuerySchema } from "../../validates/admin/audit-log.validate";

const router = Router();

router.get("/", validateQuery(auditLogListQuerySchema), getAuditLogs);

export default router;
