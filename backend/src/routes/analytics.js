import express from "express";
import { z } from "zod";
import { AnalyticsEvent } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { hasPermission } from "../utils/roles.js";

export const analyticsRouter = express.Router();

const trackSchema = z.object({
  events: z.array(z.object({
    event: z.string().min(1).max(120),
    occurred_at: z.string().datetime().optional(),
    props: z.record(z.unknown()).optional().default({}),
  })).min(1).max(50),
});

function requireAnalytics(req) {
  if (!hasPermission(req.user, "view_national_analytics") && !hasPermission(req.user, "view_institution_analytics")) {
    throw forbidden("Missing analytics permission");
  }
}

analyticsRouter.use(authMiddleware);

analyticsRouter.post("/track", validate(trackSchema), asyncHandler(async (req, res) => {
  await AnalyticsEvent.insertMany(req.body.events.map((event) => ({
    user: req.user._id,
    event: event.event,
    props: event.props,
    occurredAt: event.occurred_at ? new Date(event.occurred_at) : new Date(),
  })));
  sendSuccess(res, { accepted: req.body.events.length });
}));

analyticsRouter.get("/dau", asyncHandler(async (req, res) => {
  requireAnalytics(req);
  const series = await AnalyticsEvent.aggregate([
    { $match: { event: "session_start" } },
    { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } }, user: "$user" } } },
    { $group: { _id: "$_id.date", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: 1 } },
  ]);
  const totalUnique = new Set(series.map((item) => item.date)).size;
  sendSuccess(res, { series, total_unique: totalUnique });
}));

analyticsRouter.get("/wau", asyncHandler(async (req, res) => {
  requireAnalytics(req);
  const series = await AnalyticsEvent.aggregate([
    { $match: { event: "session_start" } },
    { $group: { _id: { week: { $dateToString: { format: "%G-W%V", date: "$occurredAt" } }, user: "$user" } } },
    { $group: { _id: "$_id.week", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: 1 } },
  ]);
  sendSuccess(res, { series, total_unique: series.reduce((sum, item) => sum + item.value, 0) });
}));

analyticsRouter.get("/engagement", asyncHandler(async (req, res) => {
  requireAnalytics(req);
  const topEvents = await AnalyticsEvent.aggregate([
    { $group: { _id: "$event", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, event: "$_id", count: 1 } },
  ]);
  sendSuccess(res, {
    dau_wau_ratio: 0,
    avg_sessions_per_user: 0,
    median_session_minutes: 0,
    top_events: topEvents,
  });
}));

