import { AppError } from "./errors.js";

export function parsePagination(query, allowedSort = ["createdAt"]) {
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "limit must be between 1 and 100", {
      issues: [{ path: ["limit"], message: "Must be between 1 and 100" }],
    });
  }

  const [field = "createdAt", direction = "desc"] = String(query.sort || "createdAt:desc").split(":");
  if (!allowedSort.includes(field) || !["asc", "desc"].includes(direction)) {
    throw new AppError(400, "VALIDATION_ERROR", "Unsupported sort", {
      issues: [{ path: ["sort"], message: "Unsupported sort field or direction" }],
    });
  }

  return { limit, cursor: query.cursor, sort: { field, direction } };
}

export function cursorFilter(cursor, sort) {
  if (!cursor) return {};
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const op = sort.direction === "desc" ? "$lt" : "$gt";
    return { [sort.field]: { [op]: decoded[sort.field] } };
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid cursor", {
      issues: [{ path: ["cursor"], message: "Invalid cursor" }],
    });
  }
}

export function pageEnvelope(items, limit, sort) {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const last = pageItems.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ id: last.id, [sort.field]: last[sort.field] })).toString("base64url")
    : null;

  return { items: pageItems, next_cursor: nextCursor, has_more: hasMore };
}
