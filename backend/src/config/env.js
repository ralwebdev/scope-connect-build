import dotenv from "dotenv";

dotenv.config();

const numberFromEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: numberFromEnv("PORT", 8080),
  mongoUri: process.env.MONGODB_URI || "mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect",
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
};

