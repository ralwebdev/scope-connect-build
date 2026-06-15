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
import { opportunitiesRouter } from "./routes/opportunities.js";
import { notificationsRouter } from "./routes/notifications.js";
import { analyticsRouter } from "./routes/analytics.js";
import { feedRouter } from "./routes/feed.js";
import { uploadRouter, filesRouter } from "./routes/upload.js";
import { healthRouter } from "./routes/health.js";
import { eventsRouter } from "./routes/events.js";
import { portfolioItemsRouter } from "./routes/portfolio-items.js";
import { reportsRouter } from "./routes/reports.js";
import { departmentsRouter } from "./routes/departments.js";
import { publicRouter } from "./routes/public.js";
import { proposalsRouter } from "./routes/proposals.js";
import { challengesRouter } from "./routes/challenges.js";
import { configRouter } from "./routes/config.js";
import { superAdminRouter } from "./routes/super-admin.js";
import { xpRouter } from "./routes/xp.js";

function isAllowedDevOrigin(origin) {
  return env.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsAllowedOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
        return callback(null, true);
      }
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

  const v1Router = express.Router();
  v1Router.use("/auth", authRouter);
  v1Router.use("/users", usersRouter);
  v1Router.use("/admin/users", adminUsersRouter);
  v1Router.use("/institutions", institutionsRouter);
  v1Router.use("/projects", projectsRouter);
  v1Router.use("/applications", applicationsRouter);
  v1Router.use("/opportunities", opportunitiesRouter);
  v1Router.use("/feed", feedRouter);
  v1Router.use("/notifications", notificationsRouter);
  v1Router.use("/analytics", analyticsRouter);
  v1Router.use("/upload", uploadRouter);
  v1Router.use("/files", filesRouter);
  v1Router.use("/events", eventsRouter);
  v1Router.use("/portfolio-items", portfolioItemsRouter);
  v1Router.use("/reports", reportsRouter);
  v1Router.use("/departments", departmentsRouter);
  v1Router.use("/public", publicRouter);
  v1Router.use("/proposals", proposalsRouter);
  v1Router.use("/challenges", challengesRouter);
  v1Router.use("/config", configRouter);
  v1Router.use("/super-admin", superAdminRouter);
  v1Router.use("/xp", xpRouter);

  app.use("/api/v1", v1Router);

  // Compatibility aliases for the unversioned endpoints documented in the v2 plan.
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/institutions", institutionsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/opportunities", opportunitiesRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/xp", xpRouter);
  app.use("/api/crm", (req, res, next) => {
    req.url = `/crm${req.url}`;
    institutionsRouter(req, res, next);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
