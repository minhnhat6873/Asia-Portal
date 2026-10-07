import { Router } from "express";

import {
  createEmployee,
  getDeletedEmployees,
  getEmployeeById,
  getEmployees,
  permanentlyDeleteEmployee,
  restoreEmployee,
  softDeleteEmployee,
  updateEmployee,
} from "../../controllers/admin/employee.controller";
import {
  requireCloudinaryConfig,
  uploadAvatar,
} from "../../helpers/multerCloudinary.helper";
import {
  requireEmployeeUpdatePermission,
  requirePermissions,
} from "../../middlewares/auth.middleware";
import {
  validateEmployeeCreateUpload,
  validateEmployeeUpdateUpload,
} from "../../middlewares/employee-upload.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { employeeListQuerySchema } from "../../validates/admin/employee.validate";

const router = Router();

router.get("/", requirePermissions("employees:view"), validateQuery(employeeListQuerySchema), getEmployees);
router.get("/trash", requirePermissions("employees:delete"), validateQuery(employeeListQuerySchema), getDeletedEmployees);
router.get("/:id", requirePermissions("employees:view"), getEmployeeById);
router.post(
  "/",
  requirePermissions("employees:create"),
  requireCloudinaryConfig,
  uploadAvatar.single("avatar"),
  validateEmployeeCreateUpload,
  createEmployee,
);
router.patch(
  "/:id",
  requireCloudinaryConfig,
  uploadAvatar.single("avatar"),
  validateEmployeeUpdateUpload,
  requireEmployeeUpdatePermission,
  updateEmployee,
);
router.post("/:id/restore", requirePermissions("employees:delete"), restoreEmployee);
router.delete("/:id/permanent", requirePermissions("employees:delete"), permanentlyDeleteEmployee);
router.delete("/:id", requirePermissions("employees:delete"), softDeleteEmployee);

export default router;
