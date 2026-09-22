import { Router } from "express";

import {
  createEmployee,
  getAdminEmployeeById,
  getAdminEmployees,
  updateEmployee,
} from "../../controllers/employee.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../../validates/employee.validate";

const router = Router();

// TODO: Gắn middleware xác thực admin trước khi triển khai production.

// GET /admin/employees - Admin xem cả nhân viên active và inactive.
router.get("/", getAdminEmployees);

// GET /admin/employees/:id - Admin xem chi tiết mọi trạng thái nhân viên.
router.get("/:id", getAdminEmployeeById);

// POST /admin/employees - Admin thêm nhân viên mới.
router.post("/", validateBody(createEmployeeSchema), createEmployee);

// PATCH /admin/employees/:id - Admin cập nhật hoặc đổi trạng thái nhân viên.
router.patch(
  "/:id",
  validateBody(updateEmployeeSchema),
  updateEmployee,
);

export default router;