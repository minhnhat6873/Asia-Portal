import { Router } from "express";

import {
  createEmployee,
  getEmployeeById,
  getEmployees,
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

const router = Router();

router.get("/", requirePermissions("employees:view"), getEmployees);
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

export default router;
