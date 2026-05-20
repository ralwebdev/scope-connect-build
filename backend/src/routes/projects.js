import express from "express";
import { z } from "zod";
import { Project, Application, Notification, ProfileActivity } from "../models/index.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { hasPermission } from "../utils/roles.js";
import { parsePagination, cursorFilter } from "../utils/pagination.js";
import { serializeProject, serializeApplication } from "../utils/serializers.js";
import { awardXp } from "../utils/xp-engine.js";

export const projectsRouter = express.Router();
export const applicationsRouter = express.Router();
async function logProfileActivity(userId, kind, text, meta = {}) {
  await ProfileActivity.create({ user: userId, kind, text, meta }).catch(() => null);
}

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
  domain: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
  capacity: z.number().int().min(1).max(100).optional().default(1),
  teams_allowed: z.number().int().min(0).max(1000).optional().default(0),
  team_members_limit: z.number().int().min(1).max(100).optional().default(1),
  starts_on: z.string().date().optional(),
  ends_on: z.string().date().optional(),
  cover_url: z.string().url().regex(/^https?:\/\//).optional(),
  visibility: z.enum(["public", "institution", "private"]).optional().default("public"),
  status: z.enum(["draft", "open", "in_review", "in_progress", "completed", "cancelled"]).optional().default("draft"),
  institution_id: z.string().optional().nullable(),
  meta: z.record(z.string()).optional(),
});

const applySchema = z.object({ message: z.string().max(2000).optional() });
const applicationPatchSchema = z.object({
  status: z.enum(["pending", "shortlisted", "accepted", "rejected", "withdrawn"]),
});
const submissionSchema = z.object({
  live_url: z.string().url().regex(/^https?:\/\//, "Must be a valid http(s) URL"),
  github_url: z.string().url().regex(/^https?:\/\//, "Must be a valid http(s) URL"),
  screenshot_file_id: z.string().min(1),
  screenshot_url: z.string().url().regex(/^https?:\/\//, "Must be a valid http(s) URL").or(z.string().startsWith("/")),
  notes: z.string().max(4000).optional().default(""),
});
const submissionReviewSchema = z.object({
  submission_review_status: z.enum(["submitted", "passed", "needs_changes"]),
  admin_comment: z.string().max(2000).optional().default(""),
});

projectsRouter.get("/", optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const { limit, cursor, sort } = parsePagination(req.query, ["createdAt", "startsOn"]);
  const filter = { ...cursorFilter(cursor, sort) };

  // Visibility and Role-based filtering
  if (!req.user || !hasPermission(req.user, "manage_projects")) {
    filter.$or = [
      { visibility: "public" },
      ...((req.user && req.user.institution) ? [{ institution: req.user.institution, visibility: "institution" }] : []),
      ...((req.user) ? [{ createdBy: req.user._id }] : []),
    ];
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.domain) filter.domain = req.query.domain;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.institution_id) filter.institution = req.query.institution_id === "null" ? null : req.query.institution_id;
  
  if (req.query.q) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { title: new RegExp(req.query.q, "i") },
        { summary: new RegExp(req.query.q, "i") },
        { description: new RegExp(req.query.q, "i") },
      ],
    });
  }

  const projects = await Project.find(filter).sort({ [sort.field]: sort.direction === "desc" ? -1 : 1 }).limit(limit + 1);
  const hasMore = projects.length > limit;
  const pageProjects = hasMore ? projects.slice(0, limit) : projects;
  const last = pageProjects.at(-1);
  sendSuccess(res, {
    items: pageProjects.map(serializeProject),
    next_cursor: hasMore && last ? Buffer.from(JSON.stringify({ id: last.id, [sort.field]: last[sort.field] })).toString("base64url") : null,
    has_more: hasMore,
  });
}));



projectsRouter.get("/:id", optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  if (project.status === "draft" && (!req.user || (project.createdBy.toString() !== req.user.id && !hasPermission(req.user, "manage_projects")))) {
    throw notFound("Project not found");
  }
  sendSuccess(res, { project: serializeProject(project) });
}));

projectsRouter.post("/", authMiddleware, requirePermission("create_project"), validate(projectSchema), asyncHandler(async (req, res) => {
  const isAdmin = hasPermission(req.user, "manage_projects");
  const institutionId = isAdmin && req.body.institution_id !== undefined 
    ? req.body.institution_id 
    : req.user.institution;

  const project = await Project.create({
    createdBy: req.user._id,
    institution: institutionId,
    title: req.body.title,
    summary: req.body.summary,
    description: req.body.description,
    domain: req.body.domain,
    tags: req.body.tags,
    capacity: req.body.capacity,
    teamsAllowed: req.body.teams_allowed,
    teamMembersLimit: req.body.team_members_limit,
    startsOn: req.body.starts_on,
    endsOn: req.body.ends_on,
    coverUrl: req.body.cover_url,
    visibility: req.body.visibility,
    status: req.body.status,
    meta: req.body.meta,
  });
  await logProfileActivity(req.user._id, "project_created", `Created project: ${project.title}`, { project_id: project.id });
  sendSuccess(res, { project: serializeProject(project) }, "Project created", 201);
}));

projectsRouter.patch("/:id", authMiddleware, validate(projectSchema.partial()), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  
  const isAdmin = hasPermission(req.user, "manage_projects");
  if (project.createdBy.toString() !== req.user.id && !isAdmin) throw forbidden();

  const oldStatus = project.status;

  Object.assign(project, {
    ...(req.body.title !== undefined && { title: req.body.title }),
    ...(req.body.summary !== undefined && { summary: req.body.summary }),
    ...(req.body.description !== undefined && { description: req.body.description }),
    ...(req.body.domain !== undefined && { domain: req.body.domain }),
    ...(req.body.tags !== undefined && { tags: req.body.tags }),
    ...(req.body.capacity !== undefined && { capacity: req.body.capacity }),
    ...(req.body.teams_allowed !== undefined && { teamsAllowed: req.body.teams_allowed }),
    ...(req.body.team_members_limit !== undefined && { teamMembersLimit: req.body.team_members_limit }),
    ...(req.body.starts_on !== undefined && { startsOn: req.body.starts_on }),
    ...(req.body.ends_on !== undefined && { endsOn: req.body.ends_on }),
    ...(req.body.cover_url !== undefined && { coverUrl: req.body.cover_url }),
    ...(req.body.visibility !== undefined && { visibility: req.body.visibility }),
    ...(req.body.status !== undefined && { status: req.body.status }),
    ...(req.body.meta !== undefined && { meta: req.body.meta }),
    ...(isAdmin && req.body.institution_id !== undefined && { institution: req.body.institution_id }),
  });
  await project.save();

  // If status changes to open, notify the creator
  if (oldStatus !== project.status && project.status === "open") {
    await Notification.create({
      user: project.createdBy,
      kind: "admin_action",
      title: "Project Approved",
      body: `Your project "${project.title}" has been approved and is now open.`,
      link: `/projects/${project._id}`,
      dedupeKey: `project:${project._id}:approved:${Date.now()}`,
    }).catch(() => null);
  }

  sendSuccess(res, { project: serializeProject(project) });
}));

projectsRouter.delete("/:id", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  if (project.createdBy.toString() !== req.user.id && !hasPermission(req.user, "manage_projects")) throw forbidden();
  project.status = "cancelled";
  await project.save();
  sendSuccess(res, null);
}));

projectsRouter.post("/:id/apply", authMiddleware, requirePermission("apply_to_project"), validate(applySchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  if (project.status !== "open") throw new AppError(422, "BUSINESS_RULE_VIOLATION", "Project is not open");
  const existing = await Application.findOne({ project: project._id, user: req.user._id, status: { $ne: "withdrawn" } });
  if (existing) throw new AppError(409, "ALREADY_APPLIED", "You have already applied");
  const application = await Application.create({ project: project._id, user: req.user._id, message: req.body.message });
  await logProfileActivity(req.user._id, "project_applied", `Applied to project: ${project.title}`, { project_id: project.id, application_id: application.id });
  await Notification.create({
    user: project.createdBy,
    kind: "application_received",
    title: "New project application",
    body: "A student applied to your project.",
    link: `/projects/${project.id}`,
    dedupeKey: `app:${application.id}:received`,
  }).catch(() => null);
  const xpResult = await awardXp({
    userId: req.user._id,
    institutionId: req.user.institution || null,
    rule: "project_application_submitted",
    dedupeKey: `project_application:${application.id}`,
    meta: { project_id: project.id, application_id: application.id },
    text: `Applied to project: ${project.title} · +100 XP`,
  });
  sendSuccess(res, {
    application: serializeApplication(application),
    xp_awarded: xpResult.awarded,
    current_xp: xpResult.xp,
  }, "Application submitted", 201);
}));

applicationsRouter.use(authMiddleware);

applicationsRouter.get("/", asyncHandler(async (req, res) => {
  const isManager = hasPermission(req.user, "manage_projects") || hasPermission(req.user, "review_application");
  const filter = req.query.project_id
    ? { project: req.query.project_id }
    : isManager
      ? {}
      : { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.project_id) {
    const project = await Project.findById(req.query.project_id);
    if (!project) throw notFound("Project not found");
    if (project.createdBy.toString() !== req.user.id && !isManager) throw forbidden();
  }
  let query = Application.find(filter).sort({ createdAt: -1 });
  if (isManager) {
    query = query.populate({ path: "user", populate: { path: "institution", select: "name" } });
  }
  const applications = await query;
  sendSuccess(res, { items: applications.map(serializeApplication), next_cursor: null, has_more: false });
}));

applicationsRouter.patch("/:id", validate(applicationPatchSchema), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate("project");
  if (!application) throw notFound("Application not found");
  const isApplicant = application.user.toString() === req.user.id;
  const isReviewer = application.project.createdBy.toString() === req.user.id || hasPermission(req.user, "review_application");
  if (isApplicant && req.body.status !== "withdrawn") throw forbidden();
  if (!isApplicant && !isReviewer) throw forbidden();
  application.status = req.body.status;
  application.reviewedBy = isReviewer ? req.user._id : application.reviewedBy;
  application.reviewedAt = isReviewer ? new Date() : application.reviewedAt;
  await application.save();
  if (isApplicant || req.user._id.toString() === application.user.toString()) {
    await logProfileActivity(application.user, "application_status", `Application status changed to ${application.status}`, { application_id: application.id });
  }
  await Notification.create({
    user: application.user,
    kind: "application_status_changed",
    title: "Application status updated",
    body: `Your application is now ${application.status}.`,
    link: `/projects/${application.project.id}`,
    dedupeKey: `app:${application.id}:status:${application.status}`,
  }).catch(() => null);
  sendSuccess(res, { application: serializeApplication(application) });
}));

applicationsRouter.post("/:id/submission", validate(submissionSchema), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate("project");
  if (!application) throw notFound("Application not found");
  const isApplicant = application.user.toString() === req.user.id;
  if (!isApplicant) throw forbidden();
  if (["rejected", "withdrawn"].includes(application.status)) {
    throw new AppError(422, "BUSINESS_RULE_VIOLATION", "This application can no longer receive submissions");
  }

  application.submission = {
    liveUrl: req.body.live_url,
    githubUrl: req.body.github_url,
    screenshotFileId: req.body.screenshot_file_id,
    screenshotUrl: req.body.screenshot_url,
    notes: req.body.notes,
    submittedAt: new Date(),
    reviewedBy: null,
    reviewedAt: null,
    adminComment: "",
  };
  application.submissionReviewStatus = "submitted";
  await application.save();

  await Notification.create({
    user: application.project.createdBy,
    kind: "project_submission_received",
    title: "Project submission received",
    body: "A student submitted their project deliverables for review.",
    link: `/projects/${application.project.id}`,
    dedupeKey: `app:${application.id}:submission:${application.updatedAt?.getTime?.() || Date.now()}`,
  }).catch(() => null);

  sendSuccess(res, { application: serializeApplication(application) }, "Submission received");
}));

applicationsRouter.patch("/:id/submission-review", validate(submissionReviewSchema), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate("project");
  if (!application) throw notFound("Application not found");
  const isReviewer = application.project.createdBy.toString() === req.user.id || hasPermission(req.user, "review_application");
  if (!isReviewer) throw forbidden();
  if (!application.submission?.submittedAt) {
    throw new AppError(422, "BUSINESS_RULE_VIOLATION", "No project submission found for this application");
  }

  application.submissionReviewStatus = req.body.submission_review_status;
  application.submission.reviewedBy = req.user._id;
  application.submission.reviewedAt = new Date();
  application.submission.adminComment = req.body.admin_comment;
  await application.save();

  await Notification.create({
    user: application.user,
    kind: "project_submission_reviewed",
    title: "Project submission reviewed",
    body: `Your submission is marked as ${application.submissionReviewStatus.replace("_", " ")}.`,
    link: `/projects/${application.project.id}`,
    dedupeKey: `app:${application.id}:submission-review:${application.submissionReviewStatus}`,
  }).catch(() => null);

  sendSuccess(res, { application: serializeApplication(application) }, "Submission review updated");
}));
