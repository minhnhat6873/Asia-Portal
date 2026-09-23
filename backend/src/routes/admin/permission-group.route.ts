import { Router } from "express";

import {
  createGroup,
  getGroups,
  updateGroup,
} from "../../controllers/admin/permission-group.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  createPermissionGroupSchema,
  updatePermissionGroupSchema,
} from "../../validates/admin/permission-group.validate";

const router = Router();

router.get("/", getGroups);
router.post("/", validateBody(createPermissionGroupSchema), createGroup);
router.patch("/:id", validateBody(updatePermissionGroupSchema), updateGroup);

export default router;
