import express from "express";
import { z } from "zod";
import { Notification, Opportunity, OpportunityApplication, Profile, User } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { hasPermission } from "../utils/roles.js";
import { serializeOpportunityApplication } from "../utils/serializers.js";
import { awardXp } from "../utils/xp-engine.js";

export const opportunitiesRouter = express.Router();

const opportunitySchema = z.object({
  title: z.string().min(1).max(200),
  by: z.string().min(1).max(100),
  company: z.string().min(1).max(140),
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(5000),
  requiredSkills: z.array(z.string().min(1).max(80)).max(20).optional().default([]),
  min_xp_required: z.number().int().min(0).max(1000000).optional().default(0),
});

const opportunityApplySchema = z.object({
  fit_note: z.string().max(2000).optional().default(""),
  portfolio_url: z.string().url().max(2000).optional().nullable(),
  github_url: z.string().url().max(2000).optional().nullable(),
  dribbble_url: z.string().url().max(2000).optional().nullable(),
  other_url: z.string().url().max(2000).optional().nullable(),
  resume_file_id: z.string().optional().nullable(),
  resume_url: z.string().url().max(2000).optional().nullable(),
});

const opportunityApplicationPatchSchema = z.object({
  status: z.enum(["pending", "shortlisted", "accepted", "rejected", "withdrawn"]).optional(),
  admin_comment: z.string().max(2000).optional(),
});

function profileTypeFor(category) {
  if (category === "Engineering") return "developer";
  if (category === "Design") return "designer";
  return "general";
}

function serializeOpportunityForViewer(opportunity, currentXp = 0) {
  const minXpRequired = opportunity.minXpRequired || 0;
  return {
    ...opportunity.toJSON(),
    min_xp_required: minXpRequired,
    unlocked: currentXp >= minXpRequired,
    xp_shortfall: Math.max(0, minXpRequired - currentXp),
  };
}

async function migrateLegacyInterestedUsers() {
  const opportunities = await Opportunity.find({
    interestedUsers: { $exists: true, $ne: [] },
  }).select("_id category interestedUsers");

  for (const opportunity of opportunities) {
    let mutated = false;
    for (const userId of opportunity.interestedUsers) {
      const existing = await OpportunityApplication.findOne({
        opportunity: opportunity._id,
        user: userId,
      }).select("_id");

      if (!existing) {
        await OpportunityApplication.create({
          opportunity: opportunity._id,
          user: userId,
          status: "pending",
          profileType: profileTypeFor(opportunity.category),
          fitNote: "Migrated automatically from legacy interest.",
        }).catch(() => null);
      }
      mutated = true;
    }

    if (mutated) {
      opportunity.interestedUsers = [];
      await opportunity.save();
    }
  }
}

opportunitiesRouter.use(authMiddleware);

opportunitiesRouter.get("/", asyncHandler(async (req, res) => {
  await migrateLegacyInterestedUsers();
  const profile = await Profile.findOne({ user: req.user._id }).select("xp");
  const currentXp = profile?.xp || 0;
  const items = await Opportunity.find().sort({ createdAt: -1 }).limit(200);
  sendSuccess(res, {
    items: items.map((item) => serializeOpportunityForViewer(item, currentXp)),
  });
}));

opportunitiesRouter.get("/applications", asyncHandler(async (req, res) => {
  await migrateLegacyInterestedUsers();
  const isManager = hasPermission(req.user, "manage_projects") || hasPermission(req.user, "review_application");
  const filter = req.query.opportunity_id
    ? { opportunity: req.query.opportunity_id }
    : isManager
      ? {}
      : { user: req.user._id };

  if (req.query.status) filter.status = req.query.status;
  let query = OpportunityApplication.find(filter).sort({ createdAt: -1 }).populate("opportunity");
  if (isManager) {
    query = query.populate({
      path: "user",
      select: "name email profile",
      populate: { path: "profile", populate: { path: "institution" } },
    });
  }
  const items = await query.limit(1000);
  sendSuccess(res, { items: items.map(serializeOpportunityApplication), next_cursor: null, has_more: false });
}));

opportunitiesRouter.post("/", requirePermission("manage_projects"), validate(opportunitySchema), asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.create({
    title: req.body.title,
    by: req.body.by,
    company: req.body.company,
    category: req.body.category,
    description: req.body.description,
    requiredSkills: req.body.requiredSkills,
    minXpRequired: req.body.min_xp_required || 0,
  });

  // Notify all student users that a new opportunity is published
  try {
    const students = await User.find({ role: "student" }).select("_id");
    const studentIds = students.map(s => s._id);
    if (studentIds.length > 0) {
      await Notification.insertMany(
        studentIds.map(studentId => ({
          user: studentId,
          kind: "system",
          title: "New Opportunity Posted",
          body: `${opportunity.company} is looking for a ${opportunity.title}. Check it out!`,
          link: "/opportunities",
          dedupeKey: `opportunity:${opportunity._id}:${studentId}`,
        })),
        { ordered: false }
      ).catch(() => null);
    }
  } catch (err) {
    console.error("Failed to push opportunity notifications:", err);
  }

  sendSuccess(res, { opportunity: serializeOpportunityForViewer(opportunity, 0) }, "Opportunity created", 201);
}));

opportunitiesRouter.post("/:id/apply", validate(opportunityApplySchema), asyncHandler(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  if (!opportunity) throw notFound("Opportunity not found");
  const profile = await Profile.findOne({ user: req.user._id }).select("xp");
  const currentXp = profile?.xp || 0;
  const minXpRequired = opportunity.minXpRequired || 0;
  if (currentXp < minXpRequired) {
    throw new AppError(403, "XP_LOCKED", "You need more XP to unlock this opportunity", {
      current_xp: currentXp,
      min_xp_required: minXpRequired,
      xp_shortfall: minXpRequired - currentXp,
    });
  }

  const existing = await OpportunityApplication.findOne({
    opportunity: opportunity._id,
    user: req.user._id,
    status: { $ne: "withdrawn" },
  });
  if (existing) throw new AppError(409, "ALREADY_APPLIED", "You have already applied to this opportunity");

  const profileType = profileTypeFor(opportunity.category);
  if (profileType === "developer" && !req.body.github_url) {
    throw new AppError(422, "VALIDATION_ERROR", "GitHub URL is required for engineering roles");
  }
  if (profileType === "designer" && !req.body.portfolio_url && !req.body.dribbble_url && !req.body.other_url) {
    throw new AppError(422, "VALIDATION_ERROR", "Design applications need a portfolio, Dribbble, Behance, Figma, or other design link");
  }
  if (profileType === "general" && !req.body.resume_file_id && !req.body.resume_url) {
    throw new AppError(422, "VALIDATION_ERROR", "Please upload a CV or provide a resume link");
  }

  const application = await OpportunityApplication.create({
    opportunity: opportunity._id,
    user: req.user._id,
    profileType,
    fitNote: req.body.fit_note || "",
    portfolioUrl: req.body.portfolio_url || "",
    githubUrl: req.body.github_url || "",
    dribbbleUrl: req.body.dribbble_url || "",
    otherUrl: req.body.other_url || "",
    resumeFileId: req.body.resume_file_id || null,
    resumeUrl: req.body.resume_url || "",
  });

  await Notification.create({
    user: req.user._id,
    kind: "opportunity_application_received",
    title: "Opportunity application submitted",
    body: `Your application for ${opportunity.title} is under review.`,
    link: "/opportunities",
    dedupeKey: `opp-app:${application.id}:submitted`,
  }).catch(() => null);

  const xpResult = await awardXp({
    userId: req.user._id,
    institutionId: req.user.institution || null,
    rule: "opportunity_application_submitted",
    dedupeKey: `opportunity_application:${application.id}`,
    meta: { opportunity_id: opportunity.id, application_id: application.id },
    text: `Applied to opportunity: ${opportunity.title} · +20 XP`,
  });

  const hydrated = await OpportunityApplication.findById(application._id)
    .populate("opportunity")
    .populate({ path: "user", select: "name email profile", populate: { path: "profile", populate: { path: "institution" } } });
  sendSuccess(res, {
    application: serializeOpportunityApplication(hydrated),
    xp_awarded: xpResult.awarded,
    current_xp: xpResult.xp,
  }, "Application submitted", 201);
}));

opportunitiesRouter.patch("/applications/:id", validate(opportunityApplicationPatchSchema), asyncHandler(async (req, res) => {
  const application = await OpportunityApplication.findById(req.params.id).populate("opportunity");
  if (!application) throw notFound("Application not found");

  const isApplicant = application.user.toString() === req.user.id;
  const isReviewer = hasPermission(req.user, "review_application") || hasPermission(req.user, "manage_projects");
  if (!isApplicant && !isReviewer) throw forbidden();
  if (isApplicant && req.body.status && req.body.status !== "withdrawn") throw forbidden();

  if (req.body.status) application.status = req.body.status;
  if (isReviewer && req.body.admin_comment !== undefined) application.adminComment = req.body.admin_comment;
  if (isReviewer) {
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
  }
  await application.save();

  await Notification.create({
    user: application.user,
    kind: "opportunity_application_status_changed",
    title: "Opportunity application updated",
    body: `Your application is now ${application.status}.`,
    link: "/opportunities",
    dedupeKey: `opp-app:${application.id}:status:${application.status}`,
  }).catch(() => null);

  const hydrated = await OpportunityApplication.findById(application._id)
    .populate("opportunity")
    .populate({ path: "user", select: "name email profile", populate: { path: "profile", populate: { path: "institution" } } });
  sendSuccess(res, { application: serializeOpportunityApplication(hydrated) });
}));

opportunitiesRouter.post("/:id/interest", asyncHandler(async (req, res) => {
  throw new AppError(
    410,
    "INTEREST_FLOW_RETIRED",
    "The interest flow has been retired. Please use the application flow instead.",
  );
}));
