import { sendError } from "../utils/response.js";

export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = "NOT_FOUND";
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  if (error?.name === "ValidationError") {
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    error.details = { issues: Object.values(error.errors || {}).map((issue) => ({ message: issue.message })) };
  }
  if (error?.status === 400 || error?.code === "VALIDATION_ERROR") {
    console.error("API 400 Validation Error details:", JSON.stringify(error.details || error.errors || error));
  }
  if (error?.code === 11000) {
    error.status = 409;
    error.code = "CONFLICT";
    error.message = "Duplicate value";
  }
  if (!error.status || error.status >= 500) {
    console.error(error);
  }
  sendError(res, error);
}

