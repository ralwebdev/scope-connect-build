import express from "express";
import { z } from "zod";
import { User, Notification, Communication } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden, notFound } from "../utils/errors.js";
import { hasPermission } from "../utils/roles.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { serializeNotification, serializeCommunication } from "../utils/serializers.js";
import { dispatchNotifications } from "../services/notification-dispatcher.js";

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
const institutionCreateSchema = z.object({
  channel: z.enum(["broadcast", "email", "notice"]).default("broadcast"),
  title: z.string().min(1).max(200),
  body: z.string().max(4000),
});

function isFacultyCoordinator(user) {
  return user?.role === "faculty" || user?.roleVariant === "faculty_coordinator";
}

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
  const result = await dispatchNotifications(userIds.map((userId) => ({
    user: userId,
    kind: req.body.kind,
    title: req.body.title,
    body: req.body.body,
    link: req.body.link,
    dedupeKey: req.body.dedupe_key,
  })), {
    source: "notifications_router_broadcast",
    requestId: res.locals.requestId,
  });
  sendSuccess(res, { created: result.created, queued: result.queued }, "Notifications queued", 201);
}));

notificationsRouter.get("/institution", asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "manage_institution") && !hasPermission(req.user, "manage_members")) throw forbidden();
  const institutionId = req.user.institution?.toString();
  if (!institutionId) throw forbidden("No institution scope");
  const limit = Math.min(Number(req.query.limit || 50), 100);

  const filter = { institution: institutionId };
  if (isFacultyCoordinator(req.user)) {
    if (!req.user.department) throw forbidden("Faculty account is not linked to a department.");
    filter.department = req.user.department;
  }

  const communications = await Communication.find(filter)
    .populate("sender", "name")
    .sort({ createdAt: -1 })
    .limit(limit);
    
  sendSuccess(res, { items: communications.map(serializeCommunication), next_cursor: null, has_more: false });
}));

notificationsRouter.post("/institution", validate(institutionCreateSchema), asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "manage_institution") && !hasPermission(req.user, "manage_members")) throw forbidden();
  const institutionId = req.user.institution?.toString();
  if (!institutionId) throw forbidden("No institution scope");

  const userFilter = { institution: institutionId, disabledAt: null };
  let communicationDepartment = null;
  if (isFacultyCoordinator(req.user)) {
    if (!req.user.department) throw forbidden("Faculty account is not linked to a department.");
    userFilter.department = req.user.department;
    userFilter.role = "student";
    communicationDepartment = req.user.department;
  }

  const users = await User.find(userFilter).select("_id");
  const userIds = users.map((user) => user._id);
  
  const communication = await Communication.create({
    title: req.body.title,
    body: req.body.body,
    channel: req.body.channel || "broadcast",
    sender: req.user._id,
    institution: institutionId,
    department: communicationDepartment,
    recipients: userIds,
    deliveredCount: userIds.length,
  });

  if (userIds.length > 0) {
    await dispatchNotifications(userIds.map((userId) => ({
      user: userId,
      kind: "admin_action",
      title: req.body.title,
      body: req.body.body,
      link: "/notifications",
      dedupeKey: `inst:${institutionId}:${communication._id}:${userId}`,
    })), {
      source: "institution_communication",
      requestId: res.locals.requestId,
    }).catch(() => null);
  }
  
  sendSuccess(res, { created: userIds.length }, "Institution communication sent", 201);
}));

