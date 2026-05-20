import express from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Event, ProfileActivity } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { notFound, forbidden, badRequest } from "../utils/errors.js";
import { awardXp, revokeXp } from "../utils/xp-engine.js";

export const eventsRouter = express.Router();

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.string().min(1).max(200),
  date: z.string().min(1).max(80),
  venue: z.string().min(1).max(200),
  seats: z.coerce.number().int().min(1).max(100000),
  color: z.enum(["brand", "cyan", "primary"]),
});

eventsRouter.use(authMiddleware);

eventsRouter.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  const instId = req.query.institutionId;
  if (instId && mongoose.Types.ObjectId.isValid(instId)) {
    filter.$or = [
      { institution: instId },
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
    rsvps: event.rsvps || [],
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

eventsRouter.post("/:id/rsvp", asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw notFound("Event not found");

  const userId = req.user._id;
  const isGoing = event.rsvps.some((id) => id.toString() === userId.toString());

  if (isGoing) {
    // Cancel RSVP
    event.rsvps = event.rsvps.filter((id) => id.toString() !== userId.toString());
    
    const xpResult = await revokeXp({
      userId,
      institutionId: req.user.institution || null,
      rule: "event_rsvp",
      meta: { event_id: event.id },
      text: `Cancelled RSVP for event: ${event.title} · -30 XP`,
    }).catch(() => ({ xp: 0 }));

    await ProfileActivity.create({
      user: userId,
      kind: "event_rsvp_cancelled",
      text: `Cancelled RSVP for event: ${event.title}`,
      meta: { eventId: event.id }
    }).catch(() => null);

    await event.save();
    sendSuccess(res, { going: false, rsvpsCount: event.rsvps.length, xp: xpResult.xp || 0 }, "RSVP cancelled");
  } else {
    // RSVP (check seats)
    if (event.rsvps.length >= event.seats) {
      throw badRequest("This event is fully booked!");
    }

    event.rsvps.push(userId);

    const xpResult = await awardXp({
      userId,
      institutionId: req.user.institution || null,
      rule: "event_rsvp",
      dedupeKey: `event_rsvp:${event.id}:${userId}`,
      meta: { event_id: event.id },
      text: `Reserved a seat for event: ${event.title} · +30 XP`,
    }).catch(() => ({ xp: 0 }));

    await ProfileActivity.create({
      user: userId,
      kind: "event_rsvp",
      text: `Reserved a seat for event: ${event.title}`,
      meta: { eventId: event.id }
    }).catch(() => null);

    await event.save();
    sendSuccess(res, { going: true, rsvpsCount: event.rsvps.length, xp: xpResult.xp || 0 }, "Seat reserved. You're on the builders list.");
  }
}));

