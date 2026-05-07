import express from "express";
import { z } from "zod";
import { Event } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";

export const eventsRouter = express.Router();

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.string().min(1).max(80),
  date: z.string().min(1).max(80),
  venue: z.string().min(1).max(200),
  seats: z.number().int().min(1).max(100000),
  color: z.enum(["brand", "cyan", "primary"]),
});

eventsRouter.use(authMiddleware);

eventsRouter.get("/", asyncHandler(async (_req, res) => {
  const items = await Event.find({}).sort({ createdAt: -1 }).limit(200);
  sendSuccess(res, { items: items.map((event) => ({
    id: event.id,
    title: event.title,
    type: event.type,
    date: event.date,
    venue: event.venue,
    seats: event.seats,
    color: event.color,
  })), next_cursor: null, has_more: false });
}));

eventsRouter.post("/", requirePermission("manage_events"), validate(eventSchema), asyncHandler(async (req, res) => {
  const event = await Event.create({
    ...req.body,
    createdBy: req.user._id,
  });
  sendSuccess(res, { event: {
    id: event.id,
    title: event.title,
    type: event.type,
    date: event.date,
    venue: event.venue,
    seats: event.seats,
    color: event.color,
  } }, "Event created", 201);
}));

