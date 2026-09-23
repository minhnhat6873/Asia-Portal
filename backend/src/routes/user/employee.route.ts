import { Router } from "express";

import {
  getEmployeeById,
  getEmployees,
} from "../../controllers/user/employee.controller";

const router = Router();

// GET /user/employees - Chỉ trả nhân viên active cho website public.
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);

export default router;
