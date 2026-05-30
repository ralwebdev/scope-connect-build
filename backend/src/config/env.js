import dotenv from "dotenv";

dotenv.config();

const numberFromEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: numberFromEnv("PORT", 8080),
  mongoUri: process.env.MONGODB_URI,
  mongoConnectMaxAttempts: numberFromEnv("MONGO_CONNECT_MAX_ATTEMPTS", 5),
  mongoRetryDelayMs: numberFromEnv("MONGO_RETRY_DELAY_MS", 1500),
  mongoServerSelectionTimeoutMs: numberFromEnv("MONGO_SERVER_SELECTION_TIMEOUT_MS", 8000),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me-change-me",
  jwtAccessTtlSeconds: numberFromEnv("JWT_ACCESS_TTL_SECONDS", 900),
  jwtRefreshTtlSeconds: numberFromEnv("JWT_REFRESH_TTL_SECONDS", 2592000),
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxUploadMb: numberFromEnv("MAX_UPLOAD_MB", 10),
  rateLimitWindowMs: numberFromEnv("RATE_LIMIT_WINDOW_MS", 60000),
  rateLimitMax: numberFromEnv("RATE_LIMIT_MAX", 100),
  authRateLimitMax: numberFromEnv("AUTH_RATE_LIMIT_MAX", 10),
  uploadRateLimitMax: numberFromEnv("UPLOAD_RATE_LIMIT_MAX", 30),
  logLevel: process.env.LOG_LEVEL || "info",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:8080",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: numberFromEnv("SMTP_PORT", 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@scopeconnect.local",
  notificationsQueueEnabled: String(process.env.NOTIFICATIONS_QUEUE_ENABLED || "true").toLowerCase() === "true",
  notificationsWorkerEnabled: String(process.env.NOTIFICATIONS_WORKER_ENABLED || "true").toLowerCase() === "true",
  notificationsWorkerConcurrency: numberFromEnv("NOTIFICATIONS_WORKER_CONCURRENCY", 10),
  notificationsOutboxSweepMs: numberFromEnv("NOTIFICATIONS_OUTBOX_SWEEP_MS", 10000),
  notificationsOutboxSweepBatchSize: numberFromEnv("NOTIFICATIONS_OUTBOX_SWEEP_BATCH_SIZE", 200),
  notificationsQueueAttempts: numberFromEnv("NOTIFICATIONS_QUEUE_ATTEMPTS", 8),
  notificationsQueueBackoffMs: numberFromEnv("NOTIFICATIONS_QUEUE_BACKOFF_MS", 2000),
  notificationsRemoveCompletedAfterSec: numberFromEnv("NOTIFICATIONS_REMOVE_COMPLETED_AFTER_SEC", 86400),
  notificationsRemoveFailedAfterSec: numberFromEnv("NOTIFICATIONS_REMOVE_FAILED_AFTER_SEC", 604800),
  redisUrl: process.env.REDIS_URL || "",
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: numberFromEnv("REDIS_PORT", 6379),
  redisUsername: process.env.REDIS_USERNAME || "",
  redisPassword: process.env.REDIS_PASSWORD || "",
  redisDb: numberFromEnv("REDIS_DB", 0),
};

