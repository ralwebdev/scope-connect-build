import { nanoid } from "nanoid";

export function requestId(req, res, next) {
  const id = req.get("X-Request-Id") || `req_${nanoid(16)}`;
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

