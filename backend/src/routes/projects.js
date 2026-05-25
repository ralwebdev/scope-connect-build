import express from "express";
import { z } from "zod";
import {
  Project,
  Application,
  Notification,
  ProfileActivity,
  Profile,
  ProjectRoom,
  ProjectTask,
  DailyReport,
  XpTransaction,
} from "../models/index.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { hasPermission } from "../utils/roles.js";
import { parsePagination, cursorFilter } from "../utils/pagination.js";
import { serializeProject, serializeApplication } from "../utils/serializers.js";
import { awardXp, forfeitReservedXp, refundReservedXp, reserveXp } from "../utils/xp-engine.js";
import { unlockAchievement } from "../utils/achievement-engine.js";
import { CONTRIBUTION_WEIGHTS, XP_ACTIONS, XP_CONSTANTS } from "../utils/xp-constants.js";


export const projectsRouter = express.Router();
export const applicationsRouter = express.Router();
async function logProfileActivity(userId, kind, text, meta = {}) {
  await ProfileActivity.create({ user: userId, kind, text, meta }).catch(() => null);
}

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  project_title: z.string().min(1).max(200).optional(),
  project_type: z.string().max(80).optional(),
  summary: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
  project_description: z.string().max(20000).optional(),
  expected_outcomes: z.array(z.string().max(500)).max(30).optional(),
  duration: z.string().max(120).optional(),
  deadline: z.string().date().optional(),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced", "Easy", "Medium", "Hard"]).optional(),
  domain: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
  capacity: z.number().int().min(1).max(100).optional().default(1),
  teams_allowed: z.number().int().min(0).max(1000).optional().default(0),
  team_members_limit: z.number().int().min(1).max(100).optional().default(1),
  starts_on: z.string().date().optional(),
  ends_on: z.string().date().optional(),
  cover_url: z.string().url().regex(/^https?:\/\//).optional(),
  visibility: z.enum(["public", "institution", "private"]).optional().default("public"),
  participants_needed: z.number().int().min(1).max(1000).optional(),
  minimum_xp_required: z.number().int().min(0).max(1000000).optional(),
  xp_commitment_stake: z.number().int().min(0).max(1000000).optional(),
  maximum_participants: z.number().int().min(1).max(1000).optional(),
  allowed_institutions: z.array(z.string().min(1)).max(100).optional(),
  required_skills: z.array(z.string().max(80)).max(50).optional(),
  role_requirements: z.array(z.object({
    role: z.string().min(1).max(80),
    count: z.number().int().min(1).max(100).optional().default(1),
    skills: z.array(z.string().max(80)).max(20).optional().default([]),
  })).max(30).optional(),
  deliverables: z.array(z.string().max(500)).max(50).optional(),
  responsibilities: z.array(z.string().max(500)).max(50).optional(),
  success_criteria: z.array(z.string().max(500)).max(50).optional(),
  daily_reporting_required: z.boolean().optional(),
  minimum_contribution_score: z.number().min(0).max(100).optional(),
  review_frequency: z.string().max(80).optional(),
  mentor_review_required: z.boolean().optional(),
  reward_pool_xp: z.number().int().min(0).max(1000000).optional(),
  stake_refund_policy: z.enum(["enabled", "disabled", "partial"]).optional(),
  performance_multiplier: z.number().min(0).max(10).optional(),
  dropout_penalty: z.number().int().min(0).max(1000000).optional(),
  inactive_penalty: z.number().int().min(0).max(1000000).optional(),
  status: z.enum(["draft", "open", "in_review", "in_progress", "completed", "cancelled"]).optional().default("draft"),
  institution_id: z.string().optional().nullable(),
  meta: z.record(z.string()).optional(),
});

const applySchema = z.object({
  message: z.string().max(2000).optional(),
  project_role: z.string().max(80).optional(),
});
const applicationPatchSchema = z.object({
  status: z.enum(["pending", "shortlisted", "accepted", "rejected", "withdrawn"]),
});
const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  assigned_to: z.array(z.string().min(1)).max(50).optional().default([]),
  deadline: z.string().datetime().optional().nullable(),
  deliverables: z.array(z.string().max(500)).max(50).optional().default([]),
  dependencies: z.array(z.string().min(1)).max(50).optional().default([]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
});
const taskStatusSchema = z.object({
  status: z.enum(["Assigned", "In Progress", "Submitted", "Reviewed", "Completed", "Rework Needed"]),
});
const taskEvidenceSchema = z.object({
  kind: z.enum(["link", "file", "screenshot", "comment"]),
  value: z.string().min(1).max(2000),
});
const roomUpdateSchema = z.object({
  daily_sync_notes: z.string().max(10000).optional(),
  meeting_note: z.string().max(5000).optional(),
  participant_progress: z.array(z.object({
    user_id: z.string().min(1),
    progress: z.number().min(0).max(100),
  })).max(100).optional(),
});
const scoreSchema = z.object({
  scores: z.array(z.object({
    application_id: z.string().min(1),
    deliverables: z.number().min(0).max(100).optional().default(0),
    reporting: z.number().min(0).max(100).optional().default(0),
    peer_review: z.number().min(0).max(100).optional().default(0),
    mentor_review: z.number().min(0).max(100).optional().default(0),
    attendance: z.number().min(0).max(100).optional().default(0),
  })).min(1).max(200),
});
const completeSchema = z.object({
  final_deliverables: z.array(z.object({
    title: z.string().max(200).optional(),
    url: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })).max(50).optional().default([]),
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

  if (req.query.status) {
    filter.status = req.query.status;
  } else {
    // Exclude soft-deleted (cancelled) projects from the default listing.
    // Admins who explicitly request ?status=cancelled will still see them.
    filter.status = { $ne: "cancelled" };
  }
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
    items: pageProjects.map((p) => serializeProject(p, req.user?._id)),
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
  sendSuccess(res, { project: serializeProject(project, req.user?._id) });
}));

projectsRouter.post("/", authMiddleware, requirePermission("create_project"), validate(projectSchema), asyncHandler(async (req, res) => {
  const isAdmin = hasPermission(req.user, "manage_projects");
  const institutionId = isAdmin && req.body.institution_id !== undefined 
    ? req.body.institution_id 
    : req.user.institution;

  const project = await Project.create({
    createdBy: req.user._id,
    institution: institutionId,
    title: req.body.project_title || req.body.title,
    projectType: req.body.project_type,
    summary: req.body.summary,
    description: req.body.project_description || req.body.description,
    expectedOutcomes: req.body.expected_outcomes,
    duration: req.body.duration,
    deadline: req.body.deadline,
    difficulty: req.body.difficulty,
    domain: req.body.domain,
    tags: req.body.tags,
    capacity: req.body.capacity,
    teamsAllowed: req.body.teams_allowed,
    teamMembersLimit: req.body.team_members_limit,
    startsOn: req.body.starts_on,
    endsOn: req.body.ends_on,
    coverUrl: req.body.cover_url,
    visibility: req.body.visibility,
    participantsNeeded: req.body.participants_needed || req.body.capacity || 1,
    minimumXpRequired: req.body.minimum_xp_required || 0,
    xpCommitmentStake: req.body.xp_commitment_stake || 0,
    maximumParticipants: req.body.maximum_participants || req.body.capacity || 1,
    allowedInstitutions: req.body.allowed_institutions || [],
    requiredSkills: req.body.required_skills || [],
    roleRequirements: req.body.role_requirements || [],
    deliverables: req.body.deliverables || [],
    responsibilities: req.body.responsibilities || [],
    successCriteria: req.body.success_criteria || [],
    dailyReportingRequired: req.body.daily_reporting_required || false,
    minimumContributionScore: req.body.minimum_contribution_score ?? XP_CONSTANTS.MIN_PROJECT_CONTRIBUTION_SCORE,
    reviewFrequency: req.body.review_frequency || XP_CONSTANTS.DEFAULT_REPORTING_FREQUENCY,
    mentorReviewRequired: req.body.mentor_review_required || false,
    rewardPoolXp: req.body.reward_pool_xp || 0,
    stakeRefundPolicy: req.body.stake_refund_policy || (XP_CONSTANTS.PROJECT_STAKE_REFUND ? "enabled" : "disabled"),
    performanceMultiplier: req.body.performance_multiplier ?? 1,
    dropoutPenalty: req.body.dropout_penalty || 0,
    inactivePenalty: req.body.inactive_penalty || 0,
    status: req.body.status,
    meta: req.body.meta,
  });
  await logProfileActivity(req.user._id, "project_created", `Created project: ${project.title}`, { project_id: project.id });
  
  if (req.user.role === "student" || req.user.role === "viewer") {
    await unlockAchievement(req.user._id, "first_project");
  }

  sendSuccess(res, { project: serializeProject(project, req.user?._id) }, "Project created", 201);
}));

function projectPatchFromBody(body, canChangeInstitution) {
  return {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.project_title !== undefined && { title: body.project_title }),
    ...(body.project_type !== undefined && { projectType: body.project_type }),
    ...(body.summary !== undefined && { summary: body.summary }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.project_description !== undefined && { description: body.project_description }),
    ...(body.expected_outcomes !== undefined && { expectedOutcomes: body.expected_outcomes }),
    ...(body.duration !== undefined && { duration: body.duration }),
    ...(body.deadline !== undefined && { deadline: body.deadline }),
    ...(body.difficulty !== undefined && { difficulty: body.difficulty }),
    ...(body.domain !== undefined && { domain: body.domain }),
    ...(body.tags !== undefined && { tags: body.tags }),
    ...(body.capacity !== undefined && { capacity: body.capacity }),
    ...(body.teams_allowed !== undefined && { teamsAllowed: body.teams_allowed }),
    ...(body.team_members_limit !== undefined && { teamMembersLimit: body.team_members_limit }),
    ...(body.starts_on !== undefined && { startsOn: body.starts_on }),
    ...(body.ends_on !== undefined && { endsOn: body.ends_on }),
    ...(body.cover_url !== undefined && { coverUrl: body.cover_url }),
    ...(body.visibility !== undefined && { visibility: body.visibility }),
    ...(body.participants_needed !== undefined && { participantsNeeded: body.participants_needed }),
    ...(body.minimum_xp_required !== undefined && { minimumXpRequired: body.minimum_xp_required }),
    ...(body.xp_commitment_stake !== undefined && { xpCommitmentStake: body.xp_commitment_stake }),
    ...(body.maximum_participants !== undefined && { maximumParticipants: body.maximum_participants }),
    ...(body.allowed_institutions !== undefined && { allowedInstitutions: body.allowed_institutions }),
    ...(body.required_skills !== undefined && { requiredSkills: body.required_skills }),
    ...(body.role_requirements !== undefined && { roleRequirements: body.role_requirements }),
    ...(body.deliverables !== undefined && { deliverables: body.deliverables }),
    ...(body.responsibilities !== undefined && { responsibilities: body.responsibilities }),
    ...(body.success_criteria !== undefined && { successCriteria: body.success_criteria }),
    ...(body.daily_reporting_required !== undefined && { dailyReportingRequired: body.daily_reporting_required }),
    ...(body.minimum_contribution_score !== undefined && { minimumContributionScore: body.minimum_contribution_score }),
    ...(body.review_frequency !== undefined && { reviewFrequency: body.review_frequency }),
    ...(body.mentor_review_required !== undefined && { mentorReviewRequired: body.mentor_review_required }),
    ...(body.reward_pool_xp !== undefined && { rewardPoolXp: body.reward_pool_xp }),
    ...(body.stake_refund_policy !== undefined && { stakeRefundPolicy: body.stake_refund_policy }),
    ...(body.performance_multiplier !== undefined && { performanceMultiplier: body.performance_multiplier }),
    ...(body.dropout_penalty !== undefined && { dropoutPenalty: body.dropout_penalty }),
    ...(body.inactive_penalty !== undefined && { inactivePenalty: body.inactive_penalty }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.meta !== undefined && { meta: body.meta }),
    ...(canChangeInstitution && body.institution_id !== undefined && { institution: body.institution_id }),
  };
}

projectsRouter.patch("/:id", authMiddleware, validate(projectSchema.partial()), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  
  const isAdmin = hasPermission(req.user, "manage_projects");
  if (project.createdBy.toString() !== req.user.id && !isAdmin) throw forbidden();

  const oldStatus = project.status;

  Object.assign(project, projectPatchFromBody(req.body, isAdmin));
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

  sendSuccess(res, { project: serializeProject(project, req.user?._id) });
}));

projectsRouter.delete("/:id", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  if (project.createdBy.toString() !== req.user.id && !hasPermission(req.user, "manage_projects")) throw forbidden();
  project.status = "cancelled";
  await project.save();
  sendSuccess(res, null);
}));

projectsRouter.post("/:id/vote", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");

  if (!project.votedBy) {
    project.votedBy = [];
  }

  const userId = req.user._id;
  const userIndex = project.votedBy.findIndex((id) => id.toString() === userId.toString());

  let voted = false;
  if (userIndex > -1) {
    // Already voted, remove vote
    project.votedBy.splice(userIndex, 1);
    voted = false;
  } else {
    // Add vote
    project.votedBy.push(userId);
    voted = true;
  }

  // Update votes count to match actual length
  project.votes = project.votedBy.length;
  await project.save();

  // Count distinct projects voted on by the current user
  const distinctVotesCount = await Project.countDocuments({ votedBy: userId });

  // Unlock "team_player" achievement if count >= 5 and user is a student or viewer
  if (distinctVotesCount >= 5 && (req.user.role === "student" || req.user.role === "viewer")) {
    await unlockAchievement(userId, "team_player");
  }

  sendSuccess(res, { voted, votes: project.votes });
}));

async function evaluateProjectEligibility({ req, project, profile }) {
  const failures = [];
  const entryXp = project.minimumXpRequired || 0;
  const stakeXp = Math.max(50, project.xpCommitmentStake || 0);
  const currentXp = profile?.xp || 0;
  const activeProjects = await Application.countDocuments({
    user: req.user._id,
    status: "accepted",
    commitmentStatus: { $in: ["reserved", "none"] },
  });

  if (req.user.role !== "student") failures.push("verified_student");
  const profileComplete = !!(profile?.profileComplete || profile?.headline || profile?.bio || profile?.skills?.length);
  if (!profileComplete) failures.push("profile_complete");
  if (currentXp < entryXp) failures.push("entry_xp");
  if (currentXp >= entryXp && currentXp < stakeXp) failures.push("stake_xp");
  if (project.allowedInstitutions?.length) {
    const institutionId = req.user.institution?.toString?.() || "";
    if (!institutionId || !project.allowedInstitutions.map(String).includes(institutionId)) failures.push("institution_eligibility");
  }
  if (project.institution) {
    const institutionId = req.user.institution?.toString?.() || "";
    if (institutionId !== project.institution.toString()) {
      failures.push("institution_eligibility");
    }
  }
  if (project.roleRequirements?.length && req.body.project_role) {
    const wanted = project.roleRequirements.some((item) => item.role === req.body.project_role);
    if (!wanted) failures.push("role_fit");
  }
  if (project.meta?.challenge_prerequisite) failures.push("challenge_prerequisite");
  if (activeProjects >= XP_CONSTANTS.MAX_CONCURRENT_PROJECTS) failures.push("max_project_limit");

  return {
    eligible: failures.length === 0,
    failures,
    entry_xp_required: entryXp,
    stake_xp_required: stakeXp,
    current_xp: currentXp,
    checks: {
      verified_student: req.user.role === "student",
      profile_complete: profileComplete,
      minimum_xp: currentXp >= entryXp,
      entry_xp: currentXp >= entryXp,
      stake_xp: currentXp >= stakeXp,
      institution_eligibility: !failures.includes("institution_eligibility"),
      role_fit: !failures.includes("role_fit"),
      challenge_prerequisite: !failures.includes("challenge_prerequisite"),
      max_project_limit: activeProjects < XP_CONSTANTS.MAX_CONCURRENT_PROJECTS,
    },
  };
}

function projectEligibilityMessage(eligibility) {
  const failureSet = new Set(eligibility?.failures || []);

  if (failureSet.has("entry_xp")) {
    return `You need at least ${eligibility?.entry_xp_required || 0} Entry XP to access this project`;
  }
  if (failureSet.has("stake_xp")) {
    return `Entry XP check passed. You still need ${eligibility?.stake_xp_required || 0} XP available to commit the project stake`;
  }
  if (failureSet.has("profile_complete")) {
    return "Complete your profile before joining this project";
  }
  if (failureSet.has("verified_student")) {
    return "Only verified student accounts can join this project";
  }
  if (failureSet.has("institution_eligibility")) {
    return "This project is restricted to selected institutions";
  }
  if (failureSet.has("role_fit")) {
    return "Selected project role is not available for this project";
  }
  if (failureSet.has("challenge_prerequisite")) {
    return "A prerequisite challenge is required before joining this project";
  }
  if (failureSet.has("max_project_limit")) {
    return "You have reached the maximum number of active projects";
  }

  return "You are not eligible to commit XP to this project yet";
}

async function ensureProjectRoom(project, application, projectRole = "") {
  let room = await ProjectRoom.findOne({ project: project._id });
  const acceptedCount = await Application.countDocuments({ project: project._id, status: "accepted" });
  const maxParticipants = project.teamMembersLimit && project.teamMembersLimit > 1 ? project.teamMembersLimit : (project.maximumParticipants || project.capacity || 1);

  if (!room) {
    room = await ProjectRoom.create({
      project: project._id,
      status: acceptedCount >= maxParticipants ? "locked" : "open",
      temporaryCoordinator: application.user,
      participants: [{
        user: application.user,
        role: projectRole || application.projectRole || "participant",
        progress: 0,
        contributionScore: 0,
      }],
    });
    application.coordinator = true;
    await application.save();
    return room;
  }

  const alreadyInRoom = room.participants.some((participant) => participant.user.toString() === application.user.toString());
  if (!alreadyInRoom) {
    room.participants.push({
      user: application.user,
      role: projectRole || application.projectRole || "participant",
      progress: 0,
      contributionScore: 0,
    });
  }
  if (acceptedCount >= maxParticipants && XP_CONSTANTS.PROJECT_ROOM_LOCK) room.status = "locked";
  await room.save();
  return room;
}

async function joinProject(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  if (project.status !== "open") throw new AppError(422, "BUSINESS_RULE_VIOLATION", "Project is not open");
  const existing = await Application.findOne({ project: project._id, user: req.user._id, status: { $ne: "withdrawn" } });
  if (existing) throw new AppError(409, "ALREADY_JOINED", "You have already joined or requested this project");

  const acceptedCount = await Application.countDocuments({ project: project._id, status: "accepted" });
  const maxParticipants = project.teamMembersLimit && project.teamMembersLimit > 1 ? project.teamMembersLimit : (project.maximumParticipants || project.capacity || 1);
  if (acceptedCount >= maxParticipants) throw new AppError(409, "PROJECT_FULL", "This project room is already locked");

  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");
  const eligibility = await evaluateProjectEligibility({ req, project, profile });
  if (!eligibility.eligible) {
    throw new AppError(403, "PROJECT_ELIGIBILITY_FAILED", projectEligibilityMessage(eligibility), eligibility);
  }

  // Platform minimum XP commitment is 50 XP. Use project stake or fall back to 50.
  const PLATFORM_MIN_STAKE = 50;
  const stake = Math.max(PLATFORM_MIN_STAKE, project.xpCommitmentStake || 0);

  const application = await Application.create({
    project: project._id,
    user: req.user._id,
    message: req.body.message,
    status: "accepted",
    projectRole: req.body.project_role || "",
    committedXp: stake,
    commitmentStatus: "reserved",
  });

  let xpResult = { reserved: stake, xp: profile.xp, reserved_xp: (profile.reservedXp || 0) + stake };
  try {
    xpResult = await reserveXp({
      userId: req.user._id,
      institutionId: req.user.institution || null,
      amount: stake,
      sourceType: "project",
      sourceId: project._id,
      action: XP_ACTIONS.PROJECT_STAKE_RESERVED,
      dedupeKey: `project_stake:${application.id}`,
      meta: { project_id: project.id, application_id: application.id },
      text: `Committed ${stake} XP to project: ${project.title}`,
    });
  } catch (error) {
    await Application.deleteOne({ _id: application._id }).catch(() => null);
    throw error;
  }

  const room = await ensureProjectRoom(project, application, req.body.project_role);
  await logProfileActivity(req.user._id, "project_joined", `Committed XP to project: ${project.title}`, {
    project_id: project.id,
    application_id: application.id,
    committed_xp: stake,
    room_id: room.id,
  });
  await Notification.create({
    user: project.createdBy,
    kind: "application_received",
    title: "New project participant",
    body: "A student committed XP and joined your project.",
    link: `/projects/${project.id}`,
    dedupeKey: `app:${application.id}:received`,
  }).catch(() => null);

  sendSuccess(res, {
    application: serializeApplication(application),
    room_id: room.id,
    committed_xp: stake,
    reserved_xp: xpResult.reserved_xp,
    current_xp: xpResult.xp,
    xp_balance_after: xpResult.xp,
    commitment_language: "Commit XP",
  }, "XP committed and project joined", 201);
}

projectsRouter.get("/:id/eligibility", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");
  const eligibility = await evaluateProjectEligibility({ req, project, profile });
  sendSuccess(res, eligibility);
}));

projectsRouter.post("/:id/join", authMiddleware, requirePermission("apply_to_project"), validate(applySchema), asyncHandler(joinProject));
projectsRouter.post("/:id/apply", authMiddleware, requirePermission("apply_to_project"), validate(applySchema), asyncHandler(joinProject));

projectsRouter.post("/:id/apply-legacy-disabled", authMiddleware, requirePermission("apply_to_project"), validate(applySchema), asyncHandler(async (req, res) => {
  throw new AppError(410, "LEGACY_APPLICATION_DISABLED", "Use Commit XP to join projects");
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

function canCoordinateProject(req, project, room) {
  const isCreator = project.createdBy.toString() === req.user.id;
  const isCoordinator = room?.temporaryCoordinator?.toString() === req.user.id;
  return isCreator || isCoordinator || hasPermission(req.user, "manage_projects") || hasPermission(req.user, "review_application");
}

projectsRouter.get("/:id/room", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const room = await ProjectRoom.findOne({ project: project._id })
    .populate("participants.user", "name email role")
    .populate("grievances.createdBy", "name email role");
  if (!room) throw notFound("Project room not found");
  const isParticipant = room.participants.some((participant) => participant.user?._id?.toString?.() === req.user.id || participant.user?.toString?.() === req.user.id);
  if (!isParticipant && !canCoordinateProject(req, project, room)) throw forbidden();
  sendSuccess(res, { room });
}));

projectsRouter.patch("/:id/room", authMiddleware, validate(roomUpdateSchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!room) throw notFound("Project room not found");
  if (!canCoordinateProject(req, project, room)) throw forbidden();

  if (req.body.daily_sync_notes !== undefined) room.dailySync.push({ notes: req.body.daily_sync_notes, createdBy: req.user._id });
  if (req.body.meeting_note) room.meetingNotes.push({ note: req.body.meeting_note, createdBy: req.user._id });
  for (const update of req.body.participant_progress || []) {
    const participant = room.participants.find((item) => item.user.toString() === update.user_id);
    if (participant) participant.progress = update.progress;
  }
  await room.save();
  
  const populated = await ProjectRoom.findOne({ project: project._id })
    .populate("participants.user", "name email role")
    .populate("grievances.createdBy", "name email role");
  sendSuccess(res, { room: populated });
}));

projectsRouter.delete("/:id/room/participants/:userId", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!room) throw notFound("Project room not found");
  
  if (!hasPermission(req.user, "manage_projects")) throw forbidden();
  
  // Remove participant from room
  room.participants = room.participants.filter(p => p.user.toString() !== req.params.userId);
  
  // If the kicked user was the temporaryCoordinator, reassign or set null
  if (room.temporaryCoordinator && room.temporaryCoordinator.toString() === req.params.userId) {
    room.temporaryCoordinator = room.participants[0]?.user || null;
  }
  
  await room.save();
  
  // Update student's application status to withdrawn
  const application = await Application.findOne({ project: project._id, user: req.params.userId });
  if (application) {
    application.status = "withdrawn";
    application.coordinator = false;
    await application.save();
  }
  
  const updatedRoom = await ProjectRoom.findOne({ project: project._id })
    .populate("participants.user", "name email role")
    .populate("grievances.createdBy", "name email role");
    
  sendSuccess(res, { room: updatedRoom });
}));

projectsRouter.patch("/:id/room/participants/:userId", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!room) throw notFound("Project room not found");
  
  if (!hasPermission(req.user, "manage_projects")) throw forbidden();
  
  const participant = room.participants.find(p => p.user.toString() === req.params.userId);
  if (!participant) throw notFound("Participant not found in project room");
  
  if (req.body.role !== undefined) {
    participant.role = req.body.role;
    // Also update Application projectRole if it exists
    const application = await Application.findOne({ project: project._id, user: req.params.userId });
    if (application) {
      application.projectRole = req.body.role;
      await application.save();
    }
  }
  
  if (req.body.isLeader === true) {
    // Demote old leader's application
    if (room.temporaryCoordinator) {
      await Application.findOneAndUpdate(
        { project: project._id, user: room.temporaryCoordinator },
        { coordinator: false }
      );
    }
    
    // Promote new leader
    room.temporaryCoordinator = req.params.userId;
    await Application.findOneAndUpdate(
      { project: project._id, user: req.params.userId },
      { coordinator: true }
    );
  }
  
  await room.save();
  
  const updatedRoom = await ProjectRoom.findOne({ project: project._id })
    .populate("participants.user", "name email role")
    .populate("grievances.createdBy", "name email role");
    
  sendSuccess(res, { room: updatedRoom });
}));

projectsRouter.post("/:id/room/grievance", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!room) throw notFound("Project room not found");
  
  // Ensure the user is the leader/temporaryCoordinator
  const isLeader = room.temporaryCoordinator && room.temporaryCoordinator.toString() === req.user.id;
  if (!isLeader) throw forbidden("Only the student project leader can submit grievances.");
  
  const { title, description } = req.body;
  if (!title || !description) {
    throw new AppError(400, "BAD_REQUEST", "Title and description are required.");
  }
  
  room.grievances.push({
    title,
    description,
    status: "open",
    createdBy: req.user._id,
  });
  
  await room.save();
  
  const updatedRoom = await ProjectRoom.findOne({ project: project._id })
    .populate("participants.user", "name email role")
    .populate("grievances.createdBy", "name email role");
    
  sendSuccess(res, { room: updatedRoom }, "Grievance submitted successfully");
}));

projectsRouter.patch("/:id/room/grievances/:grievanceId", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!room) throw notFound("Project room not found");
  
  if (!hasPermission(req.user, "manage_projects")) throw forbidden();
  
  const grievance = room.grievances.id(req.params.grievanceId);
  if (!grievance) throw notFound("Grievance not found");
  
  if (req.body.adminResponse !== undefined) {
    grievance.adminResponse = req.body.adminResponse;
  }
  if (req.body.status !== undefined) {
    grievance.status = req.body.status;
  } else {
    grievance.status = "resolved"; // Default resolve
  }
  
  await room.save();
  
  const updatedRoom = await ProjectRoom.findOne({ project: project._id })
    .populate("participants.user", "name email role")
    .populate("grievances.createdBy", "name email role");
    
  sendSuccess(res, { room: updatedRoom }, "Grievance updated successfully");
}));

projectsRouter.get("/:id/tasks", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const tasks = await ProjectTask.find({ project: project._id }).sort({ createdAt: -1 });
  sendSuccess(res, { items: tasks });
}));

projectsRouter.post("/:id/tasks", authMiddleware, validate(taskSchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!canCoordinateProject(req, project, room)) throw forbidden();

  const task = await ProjectTask.create({
    project: project._id,
    room: room?._id || null,
    title: req.body.title,
    description: req.body.description,
    assignedTo: req.body.assigned_to || [],
    deadline: req.body.deadline || null,
    deliverables: req.body.deliverables || [],
    dependencies: req.body.dependencies || [],
    priority: req.body.priority || "Medium",
    createdBy: req.user._id,
  });
  sendSuccess(res, { task }, "Task created", 201);
}));

projectsRouter.patch("/:id/tasks/:taskId", authMiddleware, validate(taskStatusSchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const task = await ProjectTask.findOne({ _id: req.params.taskId, project: project._id });
  if (!task) throw notFound("Task not found");
  const isAssigned = task.assignedTo.some((id) => id.toString() === req.user.id);
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!isAssigned && !canCoordinateProject(req, project, room)) throw forbidden();
  task.status = req.body.status;
  if (["Reviewed", "Completed", "Rework Needed"].includes(req.body.status)) {
    task.reviewedBy = req.user._id;
    task.reviewedAt = new Date();
  }
  await task.save();
  sendSuccess(res, { task });
}));

projectsRouter.post("/:id/tasks/:taskId/evidence", authMiddleware, validate(taskEvidenceSchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const task = await ProjectTask.findOne({ _id: req.params.taskId, project: project._id });
  if (!task) throw notFound("Task not found");
  const isAssigned = task.assignedTo.some((id) => id.toString() === req.user.id);
  if (!isAssigned) throw forbidden();
  task.evidence.push({ kind: req.body.kind, value: req.body.value, createdBy: req.user._id });
  task.status = "Submitted";
  await task.save();
  sendSuccess(res, { task }, "Task evidence submitted");
}));

function weightedContribution(raw) {
  return Math.round(
    ((raw.deliverables || 0) * CONTRIBUTION_WEIGHTS.deliverables
      + (raw.reporting || 0) * CONTRIBUTION_WEIGHTS.reporting
      + (raw.peer_review || 0) * CONTRIBUTION_WEIGHTS.peer_review
      + (raw.mentor_review || 0) * CONTRIBUTION_WEIGHTS.mentor_review
      + (raw.attendance || 0) * CONTRIBUTION_WEIGHTS.attendance) / 100,
  );
}

projectsRouter.post("/:id/contribution-scores", authMiddleware, validate(scoreSchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!canCoordinateProject(req, project, room)) throw forbidden();

  const updates = [];
  for (const score of req.body.scores) {
    const application = await Application.findOne({ _id: score.application_id, project: project._id, status: "accepted" });
    if (!application) continue;
    const total = weightedContribution(score);
    application.contributionScore = { ...score, total };
    application.rewardEligible = total >= (project.minimumContributionScore || XP_CONSTANTS.MIN_PROJECT_CONTRIBUTION_SCORE);
    await application.save();
    if (room) {
      const participant = room.participants.find((item) => item.user.toString() === application.user.toString());
      if (participant) participant.contributionScore = total;
    }
    updates.push(serializeApplication(application));
  }
  if (room) await room.save();
  sendSuccess(res, { items: updates });
}));

projectsRouter.post("/:id/complete", authMiddleware, validate(completeSchema), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const room = await ProjectRoom.findOne({ project: project._id });
  const canVerify = project.createdBy.toString() === req.user.id || hasPermission(req.user, "manage_projects") || hasPermission(req.user, "review_application");
  if (!canVerify) throw forbidden();

  const participants = await Application.find({ project: project._id, status: "accepted" });
  const eligible = participants.filter((item) => item.rewardEligible || (item.contributionScore?.total || 0) >= (project.minimumContributionScore || XP_CONSTANTS.MIN_PROJECT_CONTRIBUTION_SCORE));
  const perUserReward = eligible.length ? Math.floor((project.rewardPoolXp || 0) / eligible.length) : 0;
  const settled = [];

  for (const application of participants) {
    const score = application.contributionScore?.total || 0;
    const isEligible = eligible.some((item) => item.id === application.id);
    if (application.committedXp > 0 && application.commitmentStatus === "reserved") {
      if (isEligible || project.stakeRefundPolicy === "enabled") {
        await refundReservedXp({
          userId: application.user,
          institutionId: req.user.institution || null,
          amount: application.committedXp,
          sourceType: "project",
          sourceId: project._id,
          action: XP_ACTIONS.PROJECT_STAKE_REFUNDED,
          dedupeKey: `project_refund:${application.id}`,
          meta: { project_id: project.id, application_id: application.id },
          text: `Project commitment refunded: ${project.title}`,
        });
        application.commitmentStatus = "refunded";
      } else {
        const penalty = Math.min(application.committedXp, project.inactivePenalty || Math.ceil(application.committedXp / 2));
        await forfeitReservedXp({
          userId: application.user,
          institutionId: req.user.institution || null,
          amount: penalty,
          sourceType: "project",
          sourceId: project._id,
          action: XP_ACTIONS.PROJECT_STAKE_FORFEITED,
          dedupeKey: `project_forfeit:${application.id}`,
          meta: { project_id: project.id, application_id: application.id, score },
          text: `Project commitment partially forfeited: ${project.title}`,
        });
        if (application.committedXp > penalty) {
          await refundReservedXp({
            userId: application.user,
            institutionId: req.user.institution || null,
            amount: application.committedXp - penalty,
            sourceType: "project",
            sourceId: project._id,
            action: XP_ACTIONS.PROJECT_STAKE_REFUNDED,
            dedupeKey: `project_partial_refund:${application.id}`,
            meta: { project_id: project.id, application_id: application.id, score },
            text: `Project commitment partial refund: ${project.title}`,
          });
        }
        application.commitmentStatus = "forfeited";
      }
    }

    if (isEligible && perUserReward > 0) {
      const multiplier = score >= 90 ? (project.performanceMultiplier || 1) : 1;
      const reward = Math.floor(perUserReward * multiplier);
      const xpResult = await awardXp({
        userId: application.user,
        institutionId: req.user.institution || null,
        rule: "project_reward_granted",
        amountOverride: reward,
        sourceType: "project",
        sourceId: project._id,
        action: XP_ACTIONS.PROJECT_REWARD_GRANTED,
        dedupeKey: `project_reward:${application.id}`,
        meta: { project_id: project.id, application_id: application.id, score, multiplier },
        text: `Project reward granted: ${project.title}`,
      });
      application.rewardXp = xpResult.awarded;
    }
    application.rewardEligible = isEligible;
    application.settlementStatus = "settled";
    await application.save();
    settled.push(serializeApplication(application));
  }

  project.status = "completed";
  await project.save();
  if (room) {
    room.status = "completed";
    room.finalDeliverables = req.body.final_deliverables || [];
    await room.save();
  }
  sendSuccess(res, { project: serializeProject(project, req.user._id), room, participants: settled }, "Project completed and XP settled");
}));

projectsRouter.get("/:id/abuse-check", authMiddleware, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw notFound("Project not found");
  const room = await ProjectRoom.findOne({ project: project._id });
  if (!canCoordinateProject(req, project, room)) throw forbidden();
  const participants = await Application.find({ project: project._id, status: "accepted" });
  const since = new Date(Date.now() - XP_CONSTANTS.INACTIVITY_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const flags = [];
  for (const application of participants) {
    const reports = await DailyReport.countDocuments({ project: project._id, user: application.user, createdAt: { $gte: since } });
    const completedTasks = await ProjectTask.countDocuments({ project: project._id, assignedTo: application.user, status: "Completed" });
    const totalTasks = await ProjectTask.countDocuments({ project: project._id, assignedTo: application.user });
    const activeProjects = await Application.countDocuments({ user: application.user, status: "accepted", commitmentStatus: { $in: ["reserved", "none"] } });
    const sameRoleProjects = application.projectRole
      ? await Application.countDocuments({ user: application.user, status: "accepted", projectRole: application.projectRole })
      : 0;
    const [xp24h] = await XpTransaction.aggregate([
      { $match: { user_id: application.user, amount: { $gt: 0 }, createdAt: { $gte: dayAgo } } },
      { $group: { _id: "$user_id", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const [xp7d] = await XpTransaction.aggregate([
      { $match: { user_id: application.user, amount: { $gt: 0 }, createdAt: { $gte: weekAgo } } },
      { $group: { _id: "$user_id", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    if (project.dailyReportingRequired && reports === 0) flags.push({ user_id: application.user, flag: "no_reporting", severity: "warning" });
    if (totalTasks > 0 && completedTasks === 0) flags.push({ user_id: application.user, flag: "low_deliverables", severity: "warning" });
    if ((application.contributionScore?.total || 0) < 40) flags.push({ user_id: application.user, flag: "low_contribution_score", severity: "review" });
    if (activeProjects > XP_CONSTANTS.MAX_CONCURRENT_PROJECTS) {
      flags.push({ user_id: application.user, flag: "max_concurrent_projects", severity: "block", value: activeProjects });
    }
    if (sameRoleProjects >= 3) {
      flags.push({ user_id: application.user, flag: "repeated_same_role", severity: "review", role: application.projectRole, value: sameRoleProjects });
    }
    if ((xp24h?.total || 0) >= 1000 || (xp24h?.count || 0) >= 8) {
      flags.push({ user_id: application.user, flag: "too_fast_xp_growth", severity: "review", window: "24h", xp: xp24h?.total || 0, transactions: xp24h?.count || 0 });
    }
    if ((xp7d?.total || 0) >= 3000 || (xp7d?.count || 0) >= 25) {
      flags.push({ user_id: application.user, flag: "suspicious_xp_velocity", severity: "review", window: "7d", xp: xp7d?.total || 0, transactions: xp7d?.count || 0 });
    }
  }
  sendSuccess(res, { flags });
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

  if (req.body.submission_review_status === "passed" && application.settlementStatus !== "settled") {
    // 1. Refund committed stake if reserved
    if (application.committedXp > 0 && application.commitmentStatus === "reserved") {
      await refundReservedXp({
        userId: application.user,
        institutionId: application.project.institution || null,
        amount: application.committedXp,
        sourceType: "project",
        sourceId: application.project._id,
        action: XP_ACTIONS.PROJECT_STAKE_REFUNDED,
        meta: { project_id: application.project._id, application_id: application.id },
        text: `Project commitment refunded: ${application.project.title}`,
      }).catch(() => null);
      application.commitmentStatus = "refunded";
    }

    // 2. Award reward XP if project has rewardPoolXp
    const rewardAmount = application.project.rewardPoolXp || 0;
    if (rewardAmount > 0) {
      const xpResult = await awardXp({
        userId: application.user,
        institutionId: application.project.institution || null,
        rule: "project_reward_granted",
        amountOverride: rewardAmount,
        sourceType: "project",
        sourceId: application.project._id,
        action: XP_ACTIONS.PROJECT_REWARD_GRANTED,
        dedupeKey: `project_reward:${application.id}`,
        meta: { project_id: application.project._id, application_id: application.id },
        text: `Project reward granted: ${application.project.title}`,
      });
      application.rewardXp = xpResult.awarded;
    }

    application.rewardEligible = true;
    application.settlementStatus = "settled";
  }

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
