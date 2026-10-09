import { Router } from "express";

import {
  getDepartments,
  getEmployeeById,
  getEmployees,
} from "../../controllers/user/employee.controller";
import { validateQuery } from "../../middlewares/validate.middleware";
import { employeeListQuerySchema } from "../../validates/admin/employee.validate";

const router = Router();

// GET /user/employees - Chỉ trả nhân viên active cho website public.
router.get("/", validateQuery(employeeListQuerySchema), getEmployees);
router.get("/departments", getDepartments);
router.get("/:id", getEmployeeById);

export default router;
