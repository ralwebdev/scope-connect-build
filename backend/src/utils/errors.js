export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message = "Bad request", details) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const validationError = (issues) =>
  new AppError(400, "VALIDATION_ERROR", "Validation failed", { issues });

export const notFound = (message = "Resource not found") =>
  new AppError(404, "NOT_FOUND", message);

export const forbidden = (message = "Forbidden") =>
  new AppError(403, "FORBIDDEN", message);

export const unauthenticated = (code = "UNAUTHENTICATED", message = "Authentication required") =>
  new AppError(401, code, message);

