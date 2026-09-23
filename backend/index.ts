import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { connectDatabase } from "./src/config/database.config";
import {
  isAllowedCorsOrigin,
  securityConfig,
} from "./src/config/security.config";
import { globalErrorHandler } from "./src/middlewares/error.middleware";
import routes from "./src/routes/index.route";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
if (securityConfig.trustProxyHops > 0) {
  app.set("trust proxy", securityConfig.trustProxyHops);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS_ORIGIN_NOT_ALLOWED"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 60 * 60,
  }),
);

app.use(
  rateLimit({
    windowMs: securityConfig.rateLimitWindowMs,
    limit: securityConfig.rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (request) => request.path === "/health",
    message: {
      success: false,
      message: "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau.",
    },
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
