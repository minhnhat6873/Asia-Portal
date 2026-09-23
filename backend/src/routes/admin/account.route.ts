import { Router } from "express";

import {
  createAccount,
  getAccounts,
  resetPassword,
  updateAccount,
} from "../../controllers/admin/account.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  createAccountSchema,
  resetPasswordSchema,
  updateAccountSchema,
} from "../../validates/admin/account.validate";

const router = Router();

router.get("/", getAccounts);
router.post(
  "/",
  validateBody(createAccountSchema),
  createAccount,
);
router.patch(
  "/:id",
  validateBody(updateAccountSchema),
  updateAccount,
);
router.patch(
  "/:id/password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

export default router;
