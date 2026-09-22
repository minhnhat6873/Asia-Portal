import { Router } from "express";

const router = Router();

router.get("/", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "Asia API is running",
  });
});

export default router;