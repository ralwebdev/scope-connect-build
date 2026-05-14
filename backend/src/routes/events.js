import express from "express";
import { z } from "zod";
import { Event } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { notFound, forbidden } from "../utils/errors.js";

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

eventsRouter.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.institutionId) {
    filter.$or = [
      { institution: req.query.institutionId },
      { institution: null },
    ];
  } else {
    filter.institution = null;
  }
  
  const items = await Event.find(filter).sort({ createdAt: -1 }).limit(200);
  sendSuccess(res, { items: items.map((event) => ({
    id: event.id,
    title: event.title,
    type: event.type,
    date: event.date,
    venue: event.venue,
    seats: event.seats,
    color: event.color,
    institution: event.institution,
  })), next_cursor: null, has_more: false });
}));

eventsRouter.post("/", requirePermission("manage_events"), validate(eventSchema), asyncHandler(async (req, res) => {
  const event = await Event.create({
    ...req.body,
    institution: req.user.institution,
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

eventsRouter.delete("/:id", requirePermission("manage_events"), asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw notFound("Event not found");

  // If event is global (scope admin event)
  if (!event.institution) {
    if (req.user.role !== "scope_admin" && req.user.role !== "super_admin") {
      throw forbidden("You cannot delete global events created by Scope Admin");
    }
  } else {
    // If event belongs to an institution, ensure the user belongs to THAT institution
    // or is a scope admin
    const isOwner = event.institution.toString() === req.user.institution?.toString();
    const isScopeAdmin = req.user.role === "scope_admin" || req.user.role === "super_admin";
    
    if (!isOwner && !isScopeAdmin) {
       throw forbidden("You cannot delete events of other institutions");
    }
  }

  await event.deleteOne();
  sendSuccess(res, null, "Event deleted");
}));


