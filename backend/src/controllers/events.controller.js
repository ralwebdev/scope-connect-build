import { Event, EventRSVP } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";
import { notFound, badRequest } from "../utils/errors.js";

export async function listEvents(req, res) {
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
}

export async function createEvent(req, res) {
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
}

export async function rsvpEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw notFound("Event not found");

  const existingRsvp = await EventRSVP.findOne({ user: req.user._id, event: event._id });
  if (existingRsvp) throw badRequest("Already RSVPed to this event");

  await EventRSVP.create({ user: req.user._id, event: event._id });

  sendSuccess(res, null, "RSVP successful");
}
