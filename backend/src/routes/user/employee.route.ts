import { Router } from "express";

import {
  getDepartments,
  getEmployeeById,
  getEmployees,
} from "../../controllers/user/employee.controller";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { employeeListQuerySchema } from "../../validates/admin/employee.validate";

const router = Router();

// The staff directory and org chart are internal: signed-in accounts only. Without this
// the API would hand names, emails and phone numbers to anyone on the Internet.
router.use(requireUserAuth, (_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });

// GET /user/employees - Chỉ trả nhân viên active.
router.get("/", validateQuery(employeeListQuerySchema), getEmployees);
router.get("/departments", getDepartments);
router.get("/:id", getEmployeeById);

export default router;
