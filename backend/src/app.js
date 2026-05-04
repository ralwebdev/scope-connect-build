import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { globalRateLimit } from "./middleware/rate-limit.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter, adminUsersRouter } from "./routes/users.js";
import { institutionsRouter } from "./routes/institutions.js";
import { projectsRouter, applicationsRouter } from "./routes/projects.js";
import { notificationsRouter } from "./routes/notifications.js";
import { analyticsRouter } from "./routes/analytics.js";
import { uploadRouter, filesRouter } from "./routes/upload.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsAllowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    maxAge: 86400,
  }));
  app.options("*", cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.use("/api/health", healthRouter);
  app.use("/api", globalRateLimit);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/admin/users", adminUsersRouter);
  app.use("/api/institutions", institutionsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/files", filesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

