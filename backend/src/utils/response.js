export function sendSuccess(res, data = null, message, status = 200) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

export function sendError(res, error) {
  const status = error.status || 500;
  const body = {
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "Internal server error",
      request_id: res.locals.requestId,
    },
  };
  if (error.details) body.error.details = error.details;
  return res.status(status).json(body);
}

