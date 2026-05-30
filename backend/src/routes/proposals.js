import express from "express";
import { z } from "zod";
import { Proposal, User } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound, forbidden } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { hasPermission } from "../utils/roles.js";
import { dispatchNotification, dispatchNotifications } from "../services/notification-dispatcher.js";

export const proposalsRouter = express.Router();

const createProposalSchema = z.object({
  title: z.string().min(1).max(200),
  problem: z.string().min(1).max(5000),
  why: z.string().min(1).max(5000),
  team_skills: z.string().max(500).optional().default(""),
  campus_relevance: z.string().max(500).optional().default(""),
  anonymous: z.boolean().optional().default(false),
});

const patchProposalSchema = z.object({
  status: z.enum(["pending", "reviewed", "accepted", "rejected"]),
  admin_comment: z.string().max(2000).optional().default(""),
});

proposalsRouter.use(authMiddleware);

// Students submit proposal
proposalsRouter.post("/", validate(createProposalSchema), asyncHandler(async (req, res) => {
  const proposal = await Proposal.create({
    user: req.user._id,
    title: req.body.title,
    problem: req.body.problem,
    why: req.body.why,
    teamSkills: req.body.team_skills,
    campusRelevance: req.body.campus_relevance,
    anonymous: req.body.anonymous,
  });

  // Notify all Scope Admins / Super Admins in the DB about the new student proposal
  try {
    const admins = await User.find({ role: { $in: ["scope_admin", "scope_super_admin", "super_admin"] } }).select("_id");
    const adminIds = admins.map(a => a._id);
    if (adminIds.length > 0) {
      await dispatchNotifications(adminIds.map((adminId) => ({
        user: adminId,
        kind: "admin_action",
        title: "New Student Idea Suggested",
        body: `A student has suggested an idea: "${proposal.title}".`,
        link: "/scope-admin?tab=ideas",
        dedupeKey: `proposal:${proposal._id}:${adminId}`,
      })), {
        source: "proposal_created",
        requestId: res.locals.requestId,
      }).catch(() => null);
    }
  } catch (err) {
    console.error("Failed to notify admins of new proposal:", err);
  }

  sendSuccess(res, { proposal }, "Proposal submitted", 201);
}));

// Scope admins fetch all proposals
proposalsRouter.get("/", asyncHandler(async (req, res) => {
  const isAdmin = hasPermission(req.user, "manage_projects");
  if (!isAdmin) throw forbidden();

  const proposals = await Proposal.find()
    .sort({ createdAt: -1 })
    .populate({ path: "user", select: "name email" });

  sendSuccess(res, { items: proposals });
}));

// Scope admins update proposal status/feedback
proposalsRouter.patch("/:id", validate(patchProposalSchema), asyncHandler(async (req, res) => {
  const isAdmin = hasPermission(req.user, "manage_projects");
  if (!isAdmin) throw forbidden();

  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw notFound("Proposal not found");

  if (req.body.status !== undefined) proposal.status = req.body.status;
  if (req.body.admin_comment !== undefined) proposal.adminComment = req.body.admin_comment;

  await proposal.save();

  // Notify the student user about the update
  await dispatchNotification({
    user: proposal.user,
    kind: "system",
    title: "Idea Suggestion Reviewed",
    body: `Your suggested idea "${proposal.title}" has been reviewed: status is now ${proposal.status}.`,
    link: "/projects",
    dedupeKey: `proposal:${proposal._id}:status:${proposal.status}`,
  }, {
    source: "proposal_reviewed",
    requestId: res.locals.requestId,
  }).catch(() => null);

  sendSuccess(res, { proposal });
}));
