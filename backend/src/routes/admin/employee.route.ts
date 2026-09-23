import { Router } from "express";

import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "../../controllers/admin/employee.controller";
import {
  requireEmployeeUpdatePermission,
  requirePermissions,
} from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../../validates/admin/employee.validate";

const router = Router();

router.get("/", requirePermissions("employees:view"), getEmployees);
router.get("/:id", requirePermissions("employees:view"), getEmployeeById);
router.post(
  "/",
  requirePermissions("employees:create"),
  validateBody(createEmployeeSchema),
  createEmployee,
);
router.patch(
  "/:id",
  validateBody(updateEmployeeSchema),
  requireEmployeeUpdatePermission,
  updateEmployee,
);

export default router;
