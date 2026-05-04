import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const handler = (_req, res) => {
  res.setHeader("Retry-After", Math.ceil(env.rateLimitWindowMs / 1000));
  res.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests",
      request_id: res.locals.requestId,
    },
  });
};

export const globalRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const authRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const uploadRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.uploadRateLimitMax,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

