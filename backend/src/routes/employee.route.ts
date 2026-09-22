import { Router } from "express";

import {
  getPublicEmployeeById,
  getPublicEmployees,
} from "../controllers/employee.controller";

const router = Router();

// GET /employees - Public chỉ nhận danh sách nhân viên đang hoạt động.
router.get("/", getPublicEmployees);

// GET /employees/:id - Public chỉ xem được nhân viên đang hoạt động.
router.get("/:id", getPublicEmployeeById);

export default router;