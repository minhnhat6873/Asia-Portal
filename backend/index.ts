import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { connectDatabase } from "./src/config/database.config";
import { globalErrorHandler } from "./src/middlewares/error.middleware";
import routes from "./src/routes/index.route";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: process.env.DOMAIN_FRONTEND || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use((request, _response, next) => {
  if (request.body) mongoSanitize.sanitize(request.body);
  if (request.params) mongoSanitize.sanitize(request.params);
  next();
});

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.use(routes);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: "Không tìm thấy API",
  });
});

app.use(globalErrorHandler);

async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`Asia API đang chạy tại http://localhost:${port}`);
  });
}

void startServer();

export default app;