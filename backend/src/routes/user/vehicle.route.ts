import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  cancelMyVehicleRequest,
  createVehicleRequest,
  getMyVehicleRequests,
  markMyTripArrived,
  updateMyVehicleRequest,
} from "../../controllers/vehicle-booking.controller";
import { uploadVehicleReceipts } from "../../helpers/multerCloudinary.helper";
import { requireCsrfProtection } from "../../middlewares/csrf.middleware";
import { parseVehicleJsonPayload, validateVehicleMultipart } from "../../middlewares/multipart-validate.middleware";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  vehicleArrivedSchema,
  vehicleCancelSchema,
  vehicleRequestSchema,
  vehicleRequestUpdateSchema,
} from "../../validates/vehicle-booking.validate";

const router = Router();
// Signed-in employees only; name, email and department come from the account.
router.use(requireUserAuth, requireCsrfProtection, (_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.user!.id}`,
  message: { success: false, message: "Bạn đã gửi quá nhiều yêu cầu đặt xe, vui lòng thử lại sau." },
});

router.get("/mine", getMyVehicleRequests);
// JSON, or multipart with the JSON in field "payload" plus up to 3 optional pictures (field "attachments").
router.post("/", writeLimiter, uploadVehicleReceipts.array("attachments", 3), parseVehicleJsonPayload, validateVehicleMultipart(vehicleRequestSchema), createVehicleRequest);
router.patch("/:id", writeLimiter, validateBody(vehicleRequestUpdateSchema), updateMyVehicleRequest);
router.post("/:id/cancel", writeLimiter, validateBody(vehicleCancelSchema), cancelMyVehicleRequest);
// "Đã đi xong", with up to 3 optional pictures (field "receipts").
router.post("/:id/arrived", writeLimiter, uploadVehicleReceipts.array("receipts", 3), validateVehicleMultipart(vehicleArrivedSchema), markMyTripArrived);

export default router;
