import express from "express";
import { z } from "zod";
import { User, Notification } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { serializeNotification } from "../utils/serializers.js";

export const notificationsRouter = express.Router();

const patchSchema = z.object({ read: z.boolean() });
const createSchema = z.object({
  user_ids: z.array(z.string()).optional(),
  audience: z.object({ role: z.string().optional() }).optional(),
  kind: z.enum(["system", "achievement", "admin_action", "mention", "project_invite"]).default("system"),
  title: z.string().min(1).max(200),
  body: z.string().max(4000).optional(),
  link: z.string().max(400).optional(),
  dedupe_key: z.string().max(200).optional(),
});

notificationsRouter.use(authMiddleware);

notificationsRouter.get("/", asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread === "true") filter.readAt = null;
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
  sendSuccess(res, { items: notifications.map(serializeNotification), next_cursor: null, has_more: false });
}));

notificationsRouter.patch("/:id", validate(patchSchema), asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) throw notFound("Notification not found");
  notification.readAt = req.body.read ? new Date() : null;
  await notification.save();
  sendSuccess(res, { notification: serializeNotification(notification) });
}));

notificationsRouter.post("/read-all", asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
  sendSuccess(res, { updated: result.modifiedCount });
}));

notificationsRouter.post("/", requirePermission("manage_moderation"), validate(createSchema), asyncHandler(async (req, res) => {
  let userIds = req.body.user_ids || [];
  if (!userIds.length && req.body.audience?.role) {
    const users = await User.find({ role: req.body.audience.role }).select("_id");
    userIds = users.map((user) => user._id);
  }
  const docs = await Notification.insertMany(userIds.map((userId) => ({
    user: userId,
    kind: req.body.kind,
    title: req.body.title,
    body: req.body.body,
    link: req.body.link,
    dedupeKey: req.body.dedupe_key,
  })), { ordered: false }).catch((error) => error.insertedDocs || []);
  sendSuccess(res, { created: docs.length }, "Notifications sent", 201);
}));

