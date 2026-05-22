import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AnalyticsEvent, Institution, User, Profile, PortfolioLink, ProfileActivity, Session, Notification, PublicSubmission } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { parsePagination, cursorFilter } from "../utils/pagination.js";
import { deriveRoleFromEmail, hasPermission, roles, roleVariants } from "../utils/roles.js";
import { serializeUser } from "../utils/serializers.js";
import { unlockAchievement } from "../utils/achievement-engine.js";
import { awardXp } from "../utils/xp-engine.js";
import { XP_ACTIONS } from "../utils/xp-constants.js";

export const usersRouter = express.Router();
export const adminUsersRouter = express.Router();

const url = z.string().max(2000).regex(/^(https?:\/\/|\/)/).nullable().optional();

const patchUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
  handle: z.string().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  headline: z.string().max(180).optional(),
  bio: z.string().max(5000).optional(),
  avatar_url: url,
  cover_url: url,
  location: z.string().max(120).optional(),
  institution_id: z.string().optional().nullable(),
  graduation_year: z.number().int().min(1950).max(2100).optional(),
  primary_domain: z.string().max(80).optional(),
  specialization: z.string().max(120).optional(),
  skills: z.array(z.string().max(80)).max(30).optional(),
  interests: z.array(z.string().max(80)).max(30).optional(),
  availability: z.enum(["Open to collab", "Building solo", "Hiring teammates", "Looking for internship"]).optional(),
  avatar_color: z.string().max(40).optional(),
  links: z.object({
    website: url,
    github_url: url,
    twitter_url: url,
    linkedin_url: url,
    instagram_url: url,
    portfolio_website: url,
    resume_url: url,
    portfolio_pdf_url: url,
  }).partial().optional(),
});

const portfolioSchema = z.object({
  portfolio_links: z.array(z.object({
    key: z.string().min(1).max(80),
    label: z.string().min(1).max(120),
    url: z.string().url().regex(/^https?:\/\//),
    category: z.enum(["domain", "universal", "custom"]).optional().default("custom"),
  })).max(50),
});

const adminCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  salutation: z.enum(["Dr", "Mrs", "Mr"]).optional(),
  firstName: z.string().min(1).max(120).optional(),
  middleName: z.string().max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(roles),
  role_variant: z.enum(roleVariants).optional(),
  institution_id: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  send_invite: z.boolean().optional().default(false),
  password: z.string().min(8).max(128).optional(),
}).refine((body) => body.send_invite || Boolean(body.password), {
  path: ["password"],
  message: "password is required when send_invite is false",
}).refine((body) => body.role !== "institution_admin" || Boolean(body.institution_id), {
  path: ["institution_id"],
  message: "institution_id is required for institution_admin users",
});

const adminPatchSchema = z.object({
  role: z.enum(roles).optional(),
  role_variant: z.enum(roleVariants).optional(),
  institution_id: z.string().nullable().optional(),
  disabled_at: z.string().datetime().nullable().optional(),
  founder: z.boolean().optional(),
});

const memberStatusSchema = z.object({
  student_status: z.enum(["pending_verification", "active", "rejected"]),
});

const dashboardPointsSchema = z.object({
  segments: z.array(z.enum(["joined_campus", "complete_profile", "first_application", "first_portfolio"])).max(10),
});

const addXpSchema = z.object({
  amount: z.number().int().min(1).max(1000),
  reason: z.string().max(200).optional(),
});

async function findHydratedUser(id) {
  return User.findById(id).populate({ path: "profile", populate: { path: "institution" } }).populate("department");
}

function roleVariantFor(role, requested) {
  if (requested) return requested;
  if (role === "institution_admin") return "institutional_admin";
  if (role === "faculty") return "faculty_coordinator";
  if (role === "super_admin") return "scope_super_admin";
  return role;
}

function handleFromEmail(email) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueHandle(email) {
  const base = handleFromEmail(email) || `user-${Date.now().toString(36)}`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await Profile.exists({ handle: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function canCreateAdminUser(req) {
  if (req.user.role === "super_admin") return true;
  if (req.user.role === "scope_admin" && req.body.role === "institution_admin" && Boolean(req.body.institution_id)) return true;
  if (req.user.role === "institution_admin" && req.body.role === "faculty" && String(req.body.institution_id) === String(req.user.institution)) return true;
  return false;
}
async function logProfileActivity(userId, kind, text, meta = {}) {
  await ProfileActivity.create({ user: userId, kind, text, meta }).catch(() => null);
}

usersRouter.use(authMiddleware);

usersRouter.get("/leaderboard/students", asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "view_dashboard")) throw forbidden();
  
  // Rank only students by XP
  const rows = await Profile.aggregate([
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDetails" } },
    { $unwind: "$userDetails" },
    { $match: { "userDetails.role": "student", "userDetails.disabledAt": null } },
    { $sort: { xp: -1 } },
    { $limit: 100 },
  ]);

  const items = await Promise.all(rows.map(async (row) => {
    const hydrated = await findHydratedUser(row.user);
    return serializeUser(hydrated, { includePrivate: false });
  }));

  sendSuccess(res, { items: items.filter(Boolean), next_cursor: null, has_more: false });
}));

usersRouter.get("/leaderboard/campuses", asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "view_dashboard")) throw forbidden();
  const rows = await User.aggregate([
    { $match: { role: "student", disabledAt: null, institution: { $ne: null } } },
    { $group: { _id: "$institution", members: { $sum: 1 } } },
    { $lookup: { from: "institutions", localField: "_id", foreignField: "_id", as: "institution" } },
    { $unwind: "$institution" },
    { $project: { _id: 0, id: { $toString: "$institution._id" }, name: "$institution.name", city: "$institution.city", value: "$members" } },
    { $sort: { value: -1, name: 1 } },
    { $limit: 200 },
  ]);

  sendSuccess(res, {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sub: row.city || "Scope Chapter",
      value: row.value || 0,
    })),
    next_cursor: null,
    has_more: false,
  });
}));

usersRouter.get("/leaderboard/chapters", asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "view_dashboard")) throw forbidden();
  
  // Rank institutions by Total XP of their students
  const rows = await Profile.aggregate([
    { $match: { institution: { $ne: null } } },
    { $group: { _id: "$institution", totalXp: { $sum: { $ifNull: ["$xp", 0] } }, members: { $sum: 1 } } },
    { $lookup: { from: "institutions", localField: "_id", foreignField: "_id", as: "institution" } },
    { $unwind: "$institution" },
    { $project: { 
      _id: 0, 
      id: { $toString: "$institution._id" }, 
      name: "$institution.name", 
      city: "$institution.city", 
      value: "$totalXp",
      count: "$members"
    } },
    { $sort: { value: -1, count: -1 } },
    { $limit: 100 },
  ]);

  sendSuccess(res, {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sub: `${row.count} Members · ${row.city || "Active"}`,
      value: row.value || 0,
    })),
    next_cursor: null,
    has_more: false,
  });
}));

usersRouter.get("/", asyncHandler(async (req, res) => {
  const institutionId = req.query.institution_id;
  if (!hasPermission(req.user, "manage_users")) {
    const canViewInstitutionMembers = hasPermission(req.user, "manage_members") && institutionId && req.user.institution?.toString() === String(institutionId);
    const isScopeAdmin = req.user.role === "scope_admin";
    if (!canViewInstitutionMembers && !isScopeAdmin) throw forbidden();
  }
  const { limit, cursor, sort } = parsePagination(req.query, ["createdAt"]);
  const filter = { ...cursorFilter(cursor, sort) };
  if (institutionId) filter.institution = institutionId;
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    filter.$or = [
      { email: new RegExp(req.query.q, "i") },
      { name: new RegExp(req.query.q, "i") },
    ];
  }
  const users = await User.find(filter).sort({ [sort.field]: sort.direction === "desc" ? -1 : 1 }).limit(limit + 1);
  const hasMore = users.length > limit;
  const pageUsers = hasMore ? users.slice(0, limit) : users;
  const items = await Promise.all(pageUsers.map(async (user) => serializeUser(await findHydratedUser(user._id), { includePrivate: true })));
  const last = pageUsers.at(-1);
  sendSuccess(res, {
    items,
    next_cursor: hasMore && last ? Buffer.from(JSON.stringify({ id: last.id, [sort.field]: last[sort.field] })).toString("base64url") : null,
    has_more: hasMore,
  });
}));

usersRouter.patch("/:id/member-status", validate(memberStatusSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");
  const sameInstitution = user.institution?.toString() && user.institution.toString() === req.user.institution?.toString();
  if (!sameInstitution || !hasPermission(req.user, "approve_students")) throw forbidden();
  user.studentStatus = req.body.student_status;
  await user.save();
  await Profile.findOneAndUpdate(
    { user: user._id },
    { institutionVerified: req.body.student_status === "active" },
  );

  // Trigger notifications
  try {
    if (req.body.student_status === "active") {
      await unlockAchievement(user._id, "verified_builder");
      await Notification.create({
        user: user._id,
        kind: "achievement",
        title: "Account Verified!",
        body: `An administrator has approved your account. Welcome to Scope Connect!`,
        link: "/",
        dedupeKey: `user:${user._id}:verified:${Date.now()}`,
      }).catch(() => null);
    } else if (req.body.student_status === "rejected") {
      await Notification.create({
        user: user._id,
        kind: "system",
        title: "Account Verification Rejected",
        body: `Your account verification has been rejected by an administrator.`,
        link: "/",
        dedupeKey: `user:${user._id}:rejected:${Date.now()}`,
      }).catch(() => null);
    }
  } catch (err) {
    console.error("Failed to push verification status notification:", err);
  }

  await AnalyticsEvent.create({
    user: req.user._id,
    event: "student_verification",
    props: {
      target_user_id: user.id,
      institution_id: user.institution?.toString(),
      status: req.body.student_status,
      actor_role: req.user.role,
    },
  });
  sendSuccess(res, { user: await serializeUser(await findHydratedUser(user._id), { includePrivate: true }) });
}));

usersRouter.get("/:id", asyncHandler(async (req, res) => {
  const user = await findHydratedUser(req.params.id);
  if (!user) throw notFound("User not found");
  const includePrivate = req.user.id === user.id || req.user.role === "super_admin";
  sendSuccess(res, { user: await serializeUser(user, { includePrivate }) });
}));

usersRouter.get("/me/feedback", asyncHandler(async (req, res) => {
  const submissions = await PublicSubmission.find({
    user: req.user._id,
    kind: { $in: ["feedback", "contact", "support_issue"] }
  }).sort({ createdAt: -1 });

  sendSuccess(res, { feedback: submissions });
}));

usersRouter.post("/join-chapter", validate(z.object({ institution_id: z.string().min(1) })), asyncHandler(async (req, res) => {
  const { institution_id } = req.body;
  const institution = await Institution.findById(institution_id);
  if (!institution) throw notFound("Institution not found");

  const user = await User.findById(req.user._id);
  if (!user) throw notFound("User not found");

  // Update User and Profile institution reference and reset status
  user.institution = institution._id;
  user.studentStatus = "pending_verification";
  await user.save();

  await Profile.findOneAndUpdate(
    { user: user._id },
    {
      institution: institution._id,
      institutionVerified: false,
    },
    { new: true, upsert: true }
  );

  // Award +40 XP for joining chapter (idempotent via dedupeKey)
  const xpResult = await awardXp({
    userId: user._id,
    institutionId: institution._id,
    rule: "dashboard_joined_campus",
    amountOverride: 40,
    dedupeKey: `joined_campus:${user._id}:${institution._id}`,
    text: `Joined ${institution.name} chapter · +40 XP`,
  });

  // Create welcome notification
  await Notification.create({
    user: user._id,
    kind: "system",
    title: `Joined ${institution.name}!`,
    body: `Welcome to the chapter. Your membership is pending verification by the campus coordinator.`,
    link: "/campus",
    dedupeKey: `chapter_joined:${user._id}:${institution._id}:${Date.now()}`,
  }).catch(() => null);

  // Hydrate user and return
  const hydratedUser = await findHydratedUser(user._id);
  sendSuccess(res, {
    user: await serializeUser(hydratedUser, { includePrivate: true }),
    awarded_xp: xpResult.awarded,
  }, "Chapter joined successfully");
}));

usersRouter.post("/me/opportunity-verification", asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");

  if (profile.opportunitiesVerificationStatus === "pending") {
    throw new AppError(400, "ALREADY_PENDING", "Verification request is already pending review.");
  }

  // Gather links for the admin to review
  const links = {
    website: profile.website,
    github: profile.githubUrl,
    linkedin: profile.linkedinUrl,
    portfolio: profile.portfolioWebsite,
    resume: profile.resumeUrl,
    portfolioPdf: profile.portfolioPdfUrl,
    portfolioLinks: profile.portfolioLinks || {},
  };

  const submission = await PublicSubmission.create({
    kind: "opportunity_verification",
    source: "profile_verification_tab",
    user: req.user._id,
    institution: req.user.institution || null,
    role: req.user.role,
    name: req.user.name,
    email: req.user.email,
    message: `Opportunity Verification Request from ${req.user.name}. Portfolio Links: ${JSON.stringify(links, null, 2)}`,
  });

  profile.opportunitiesVerificationStatus = "pending";
  await profile.save();

  sendSuccess(res, { submission_id: submission.id }, "Verification request submitted successfully");
}));

usersRouter.get("/me/rank", asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");
  
  const xp = profile.xp || 0;
  
  // Global Rank (National)
  const globalRank = await Profile.countDocuments({ 
    xp: { $gt: xp }
  }) + 1;
  
  // Campus Rank
  let campusRank = null;
  if (req.user.institution) {
    campusRank = await Profile.countDocuments({ 
      institution: req.user.institution,
      xp: { $gt: xp }
    }) + 1;
  }
  
  sendSuccess(res, { globalRank, campusRank });
}));

usersRouter.get("/me/activity", asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const items = await ProfileActivity.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit);
  sendSuccess(res, {
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      text: item.text,
      created_at: item.createdAt,
      meta: item.meta || {},
    })),
    next_cursor: null,
    has_more: false,
  });
}));

usersRouter.post("/me/dashboard-points", validate(dashboardPointsSchema), asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");

  const rewards = {
    joined_campus: 30,
    complete_profile: 40,
    first_application: 50,
    first_portfolio: 30,
  };
  const labels = {
    joined_campus: "Joined your campus",
    complete_profile: "Completed your profile",
    first_application: "Applied to first challenge",
    first_portfolio: "Added first portfolio link",
  };

  const uniqueSegments = [...new Set(req.body.segments)];
  let awarded = 0;
  const awardedSegments = [];

  for (const segment of uniqueSegments) {
    const alreadyAwarded = await ProfileActivity.exists({
      user: req.user._id,
      kind: "dashboard_segment_reward",
      "meta.segment": segment,
    });
    if (alreadyAwarded) continue;
    const amount = rewards[segment] || 0;
    if (!amount) continue;
    const xpResult = await awardXp({
      userId: req.user._id,
      institutionId: req.user.institution || null,
      rule: `dashboard_${segment}`,
      amountOverride: amount,
      sourceType: "dashboard",
      sourceId: segment,
      action: XP_ACTIONS.ADMIN_ADJUSTMENT,
      dedupeKey: `dashboard_segment:${req.user.id}:${segment}`,
      meta: { segment },
      text: `${labels[segment]} +${amount} XP`,
    });
    awarded += xpResult.awarded;
    awardedSegments.push(segment);
    await ProfileActivity.create({
      user: req.user._id,
      kind: "dashboard_segment_reward",
      text: `${labels[segment]} · +${amount} XP`,
      meta: { segment, amount },
    });
    await AnalyticsEvent.create({
      user: req.user._id,
      event: "dashboard_segment_reward",
      props: { segment, amount },
    });
  }

    sendSuccess(res, {
      awarded,
      awarded_segments: awardedSegments,
      user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }),
    });
  }),
);

usersRouter.post(
  "/me/xp",
  validate(addXpSchema),
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) throw notFound("Profile not found");

    const amount = req.body.amount;
    const xpResult = await awardXp({
      userId: req.user._id,
      institutionId: req.user.institution || null,
      rule: "manual_adjustment",
      amountOverride: amount,
      sourceType: "user",
      sourceId: req.user._id,
      action: XP_ACTIONS.ADMIN_ADJUSTMENT,
      meta: { reason: req.body.reason || "XP synchronized" },
      text: req.body.reason || `Earned ${amount} XP`,
    });

    sendSuccess(res, { xp: xpResult.xp }, "XP synchronized");
  }),
);

usersRouter.post(
  "/me/streak-tick",
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) throw notFound("Profile not found");

    const now = new Date();
    const last = profile.lastActiveDate;
    
    // Normalize to dates (remove time)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDate = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate()) : null;

    if (lastDate && today.getTime() === lastDate.getTime()) {
      return sendSuccess(res, { streak: profile.streakDays || 1, status: "already_ticked" });
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate && lastDate.getTime() === yesterday.getTime()) {
      profile.streakDays = (profile.streakDays || 0) + 1;
    } else {
      profile.streakDays = 1;
    }

    profile.lastActiveDate = now;
    await profile.save();

    // Reward XP for streak (if > 1)
    if (profile.streakDays > 1) {
      const amount = 50;
      const xpResult = await awardXp({
        userId: req.user._id,
        institutionId: req.user.institution || null,
        rule: "streak_bonus",
        amountOverride: amount,
        sourceType: "streak",
        sourceId: today.toISOString().slice(0, 10),
        action: XP_ACTIONS.ADMIN_ADJUSTMENT,
        dedupeKey: `streak:${req.user.id}:${today.toISOString().slice(0, 10)}`,
        meta: { days: profile.streakDays },
        text: `Maintained a ${profile.streakDays} day streak!`,
      });
      profile.xp = xpResult.xp;
    }

    sendSuccess(res, { streak: profile.streakDays, xp: profile.xp }, "Streak updated");
  }),
);

// ── Weekly Mission ────────────────────────────────────────────────────────────
// Uses ProfileActivity as a zero-schema-change deduplication ledger.
// The week key format is "YYYY-Www" (ISO week) so it resets automatically.

function isoWeekKey() {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

usersRouter.get("/me/weekly-mission-status", asyncHandler(async (req, res) => {
  const weekKey = isoWeekKey();
  const alreadyClaimed = await ProfileActivity.exists({
    user: req.user._id,
    kind: "weekly_mission_claimed",
    "meta.weekKey": weekKey,
  });
  sendSuccess(res, { claimed: Boolean(alreadyClaimed), week_key: weekKey });
}));

usersRouter.post("/me/weekly-mission-claim", asyncHandler(async (req, res) => {
  const weekKey = isoWeekKey();

  // Idempotent — silently return ok if already claimed this week
  const alreadyClaimed = await ProfileActivity.exists({
    user: req.user._id,
    kind: "weekly_mission_claimed",
    "meta.weekKey": weekKey,
  });
  if (alreadyClaimed) {
    return sendSuccess(res, { already_claimed: true, xp: null });
  }

  const { amount = 60, mission_title = "Weekly Mission" } = req.body;
  const safeAmount = Math.min(Math.max(Number(amount) || 60, 1), 500);

  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");

  const xpResult = await awardXp({
    userId: req.user._id,
    institutionId: req.user.institution || null,
    rule: "weekly_mission_claimed",
    amountOverride: safeAmount,
    sourceType: "weekly_mission",
    sourceId: weekKey,
    action: XP_ACTIONS.ADMIN_ADJUSTMENT,
    dedupeKey: `weekly_mission:${req.user.id}:${weekKey}`,
    meta: { weekKey, mission_title },
    text: `Completed Weekly Mission: ${mission_title} +${safeAmount} XP`,
  });

  await ProfileActivity.create({
    user: req.user._id,
    kind: "weekly_mission_claimed",
    text: `Completed Weekly Mission: ${mission_title} · +${safeAmount} XP`,
    meta: { weekKey, amount: safeAmount, mission_title },
  });

  sendSuccess(res, { already_claimed: false, xp: xpResult.xp }, "Weekly mission reward claimed");
}));

// ── Saved Projects ────────────────────────────────────────────────────────────

usersRouter.get("/me/saved-projects", asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");
  sendSuccess(res, { saved_projects: profile.savedProjects || [] });
}));

usersRouter.post("/me/saved-projects", asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");
  
  const { id, action } = req.body;
  if (!id) throw new AppError(400, "BAD_REQUEST", "Project ID is required");
  
  const saved = profile.savedProjects || [];
  const idx = saved.indexOf(id);
  
  if (action === "save" && idx === -1) {
    saved.push(id);
  } else if (action === "unsave" && idx !== -1) {
    saved.splice(idx, 1);
  }
  
  profile.savedProjects = saved;
  await profile.save();
  
  sendSuccess(res, { saved_projects: profile.savedProjects }, `Project ${action}d`);
}));

usersRouter.post("/me/tick", asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const lastActive = profile.lastActiveDate;
  const lastStr = lastActive ? `${lastActive.getFullYear()}-${lastActive.getMonth() + 1}-${lastActive.getDate()}` : "";
  
  if (lastStr === todayStr) {
    return sendSuccess(res, { streak: profile.streakDays || 0, user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }) });
  }

  const yesterday = new Date(Date.now() - 86400000);
  const ystamp = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  
  profile.streakDays = lastStr === ystamp ? (profile.streakDays || 0) + 1 : 1;
  profile.lastActiveDate = today;
  
  if (profile.streakDays > 1) {
    await ProfileActivity.create({
      user: req.user._id,
      kind: "streak_reward",
      text: `Day ${profile.streakDays} login streak`,
    });
  }
  await profile.save();
  sendSuccess(res, { streak: profile.streakDays, user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }) });
}));

usersRouter.post("/me/xp", asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount) || 0;
  const reason = req.body.reason || "Activity reward";
  if (amount <= 0) return sendSuccess(res, { message: "Invalid amount" });

  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw notFound("Profile not found");

  const xpResult = await awardXp({
    userId: req.user._id,
    institutionId: req.user.institution || null,
    rule: "manual_adjustment",
    amountOverride: amount,
    sourceType: "user",
    sourceId: req.user._id,
    action: XP_ACTIONS.ADMIN_ADJUSTMENT,
    meta: { reason },
    text: `${reason} +${amount} XP`,
  });

  await ProfileActivity.create({
    user: req.user._id,
    kind: "activity_reward",
    text: `${reason} · +${amount} XP`,
  });

  sendSuccess(res, { xp: xpResult.xp, user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }) });
}));

usersRouter.patch("/:id", validate(patchUserSchema), asyncHandler(async (req, res) => {
  if (String(req.user.id) !== String(req.params.id) && req.user.role !== "super_admin") throw forbidden();
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");
  if (req.body.email) {
    const duplicate = await User.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: user._id } });
    if (duplicate) throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
    user.email = req.body.email;
  }
  if (req.body.name) user.name = req.body.name;
  if (req.body.institution_id !== undefined) user.institution = req.body.institution_id;
  await user.save();

  const profile = await Profile.findOneAndUpdate(
    { user: user._id },
    {
      ...(req.body.handle !== undefined && { handle: req.body.handle }),
      ...(req.body.headline !== undefined && { headline: req.body.headline }),
      ...(req.body.bio !== undefined && { bio: req.body.bio }),
      ...(req.body.skills !== undefined && { skills: req.body.skills }),
      ...(req.body.interests !== undefined && { interests: req.body.interests }),
      ...(req.body.availability !== undefined && { availability: req.body.availability }),
      ...(req.body.avatar_color !== undefined && { avatarColor: req.body.avatar_color }),
      ...(req.body.avatar_url !== undefined && { avatarUrl: req.body.avatar_url }),
      ...(req.body.cover_url !== undefined && { coverUrl: req.body.cover_url }),
      ...(req.body.location !== undefined && { location: req.body.location }),
      ...(req.body.institution_id !== undefined && { institution: req.body.institution_id }),
      ...(req.body.graduation_year !== undefined && { graduationYear: req.body.graduation_year }),
      ...(req.body.primary_domain !== undefined && { primaryDomain: req.body.primary_domain }),
      ...(req.body.specialization !== undefined && { specialization: req.body.specialization }),
      ...(req.body.links?.website !== undefined && { website: req.body.links.website }),
      ...(req.body.links?.github_url !== undefined && { githubUrl: req.body.links.github_url }),
      ...(req.body.links?.twitter_url !== undefined && { twitterUrl: req.body.links.twitter_url }),
      ...(req.body.links?.linkedin_url !== undefined && { linkedinUrl: req.body.links.linkedin_url }),
      ...(req.body.links?.instagram_url !== undefined && { instagramUrl: req.body.links.instagram_url }),
      ...(req.body.links?.portfolio_website !== undefined && { portfolioWebsite: req.body.links.portfolio_website }),
      ...(req.body.links?.resume_url !== undefined && { resumeUrl: req.body.links.resume_url }),
      ...(req.body.links?.portfolio_pdf_url !== undefined && { portfolioPdfUrl: req.body.links.portfolio_pdf_url }),
    },
    { new: true, upsert: true },
  );
  await profile.save();
  await logProfileActivity(user._id, "profile_updated", "Updated profile details");
  sendSuccess(res, { user: await serializeUser(await findHydratedUser(user._id), { includePrivate: true }) });
}));

usersRouter.post("/profile", validate(portfolioSchema), asyncHandler(async (req, res) => {
  await PortfolioLink.deleteMany({ user: req.user._id });
  await PortfolioLink.insertMany(req.body.portfolio_links.map((link, index) => ({
    user: req.user._id,
    key: link.key,
    label: link.label,
    url: link.url,
    category: link.category,
    position: index,
  })));
  await logProfileActivity(req.user._id, "portfolio_updated", "Updated portfolio links");
  sendSuccess(res, { user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }) });
}));

adminUsersRouter.use(authMiddleware);

adminUsersRouter.post("/", validate(adminCreateSchema), asyncHandler(async (req, res) => {
  if (!canCreateAdminUser(req)) throw forbidden();
  const email = req.body.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
  const institution = req.body.institution_id ? await Institution.findById(req.body.institution_id) : null;
  if (req.body.institution_id && !institution) throw notFound("Institution not found");
  if (req.body.role === "institution_admin") {
    if (institution.pipelineStage !== "Launch Pending") {
      throw new AppError(409, "INSTITUTION_NOT_LAUNCH_PENDING", "Institution credentials can only be generated at Launch Pending stage");
    }
    const existingInstitutionAdmin = await User.exists({ role: "institution_admin", institution: institution._id });
    if (existingInstitutionAdmin) {
      throw new AppError(409, "INITIAL_INSTITUTION_ADMIN_EXISTS", "Initial institutional admin already exists for this institution");
    }
  }
  const inviteToken = req.body.send_invite ? crypto.randomUUID() : null;
  const derived = deriveRoleFromEmail(email, req.body.role);

  let finalName = req.body.name;
  if (!finalName && req.body.firstName && req.body.lastName) {
    finalName = [req.body.firstName, req.body.middleName, req.body.lastName].filter(Boolean).join(" ");
  }
  if (!finalName) finalName = email.split("@")[0];

  const user = await User.create({
    email,
    name: finalName,
    salutation: req.body.salutation,
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    passwordHash: await bcrypt.hash(req.body.password || inviteToken, 12),
    role: req.body.role || derived.role,
    roleVariant: roleVariantFor(req.body.role || derived.role, req.body.role_variant),
    institution: institution?._id ?? null,
    department: req.body.department_id || null,
    founder: derived.founder,
  });
  try {
    await Profile.create({
      user: user._id,
      handle: await uniqueHandle(email),
      institution: institution?._id ?? null,
      institutionVerified: Boolean(institution),
      availability: "Open to collab",
      avatarColor: "#00D1FF",
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
  await AnalyticsEvent.create({
    user: req.user._id,
    event: "credential_created",
    props: {
      target_user_id: user.id,
      target_role: user.role,
      institution_id: institution?.id ?? null,
      actor_role: req.user.role,
    },
  });
  sendSuccess(res, {
    user: await serializeUser(await findHydratedUser(user._id), { includePrivate: true }),
    invite_token: inviteToken,
  }, "User created", 201);
}));

adminUsersRouter.patch("/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");

  // Permission Check: Super Admin OR Scope Admin OR Institutional Admin for their own campus members
  const isSuperAdmin = hasPermission(req.user, "manage_users");
  const isScopeAdmin = req.user.role === "scope_admin";
  const isInstAdmin = (req.user.role === "institutional_admin" || req.user.role === "institution_admin") && 
                     user.institution?.toString() === req.user.institution?.toString();

  if (!isSuperAdmin && !isScopeAdmin && !isInstAdmin) throw forbidden();

  if (req.body.student_status !== undefined) {
    const status = req.body.student_status;
    if (status === "active") {
      user.studentStatus = "active";
      user.disabledAt = null;
      await user.save();
      await Profile.findOneAndUpdate(
        { user: user._id },
        { institutionVerified: true }
      );
    } else if (status === "rejected" || status === "deactivated") {
      user.studentStatus = "rejected";
      if (status === "deactivated") {
        user.disabledAt = new Date();
      }
      await user.save();
      await Profile.findOneAndUpdate(
        { user: user._id },
        { institutionVerified: false }
      );
    } else if (status === "pending_verification") {
      user.studentStatus = "pending_verification";
      user.disabledAt = null;
      await user.save();
      await Profile.findOneAndUpdate(
        { user: user._id },
        { institutionVerified: false }
      );
    }
    
    // Trigger notification
    try {
      if (status === "active") {
        await unlockAchievement(user._id, "verified_builder");
        await Notification.create({
          user: user._id,
          kind: "achievement",
          title: "Account Verified!",
          body: `An administrator has approved your account. Welcome to Scope Connect!`,
          link: "/",
          dedupeKey: `user:${user._id}:verified:${Date.now()}`,
        }).catch(() => null);
      } else if (status === "rejected" || status === "deactivated") {
        await Notification.create({
          user: user._id,
          kind: "system",
          title: "Account Verification Rejected",
          body: `Your account verification has been rejected or deactivated by an administrator.`,
          link: "/",
          dedupeKey: `user:${user._id}:rejected:${Date.now()}`,
        }).catch(() => null);
      }
    } catch (err) {
      console.error("Failed to push verification status notification:", err);
    }
  }

  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.role_variant !== undefined || req.body.role !== undefined) {
    user.roleVariant = roleVariantFor(req.body.role || user.role, req.body.role_variant);
  }
  if (req.body.disabled_at !== undefined) user.disabledAt = req.body.disabled_at ? new Date(req.body.disabled_at) : null;
  if (req.body.founder !== undefined) user.founder = req.body.founder;
  await user.save();
  if (req.body.institution_id !== undefined) {
    const institution = req.body.institution_id ? await Institution.findById(req.body.institution_id) : null;
    if (req.body.institution_id && !institution) throw notFound("Institution not found");
    user.institution = institution?._id ?? null;
    await user.save();
    await Profile.findOneAndUpdate(
      { user: user._id },
      { institution: institution?._id ?? null, institutionVerified: Boolean(institution) },
      { upsert: true },
    );
  }
  if (user.disabledAt) await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  sendSuccess(res, { user: await serializeUser(await findHydratedUser(user._id), { includePrivate: true }) });
}));
adminUsersRouter.delete("/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");

  // Permission Check: Super Admin OR Institutional Admin for their own campus members
  const isSuperAdmin = hasPermission(req.user, "manage_users");
  const isInstAdmin = (req.user.role === "institutional_admin" || req.user.role === "institution_admin") && 
                     user.institution?.toString() === req.user.institution?.toString();

  if (!isSuperAdmin && !isInstAdmin) throw forbidden();

  await User.findByIdAndDelete(req.params.id);
  await Profile.deleteOne({ user: req.params.id });
  await Session.deleteMany({ user: req.params.id });
  
  sendSuccess(res, { message: "User deleted successfully" });
}));

// ── Admin Feedback & Support Management ──────────────────────────────────────────

adminUsersRouter.get("/feedback", asyncHandler(async (req, res) => {
  const isAllowed = req.user.role === "scope_admin" || req.user.role === "scope_super_admin" || req.user.role === "super_admin";
  if (!isAllowed) throw forbidden();

  const submissions = await PublicSubmission.find({
    kind: { $in: ["feedback", "contact", "support_issue", "opportunity_verification"] }
  })
    .populate("user", "name email role")
    .populate("institution", "name slug")
    .sort({ createdAt: -1 });

  const normalizedFeedback = submissions.map(item => {
    let type = item.type;
    let message = item.message;

    if (item.kind === "contact") {
      type = "Contact Inquiry";
      message = `[Contact Form - From: ${item.name || "Anonymous"} (${item.email || "No Email"})]\n\n${item.message}`;
    } else if (item.kind === "support_issue") {
      type = "Bug report";
      message = `[Support Ticket]\n\n${item.message}`;
    } else if (item.kind === "opportunity_verification") {
      type = "Opportunity Verification";
      message = `[Verification Request]\n\n${item.message}`;
    }

    return {
      id: item._id.toString(),
      kind: item.kind,
      source: item.source,
      status: item.status,
      name: item.name,
      email: item.email,
      type: type || "General suggestion",
      message: message || "",
      rating: item.rating,
      createdAt: item.createdAt,
      user: item.user,
      institution: item.institution,
      role: item.role,
    };
  });

  sendSuccess(res, { feedback: normalizedFeedback });
}));

adminUsersRouter.patch("/feedback/:id", asyncHandler(async (req, res) => {
  const isAllowed = req.user.role === "scope_admin" || req.user.role === "scope_super_admin" || req.user.role === "super_admin";
  if (!isAllowed) throw forbidden();

  const { status } = req.body;
  if (!["new", "reviewed", "closed", "verified", "rejected"].includes(status)) {
    throw new AppError(400, "INVALID_STATUS", "Invalid status value");
  }

  const submission = await PublicSubmission.findOneAndUpdate(
    { _id: req.params.id, kind: { $in: ["feedback", "contact", "support_issue", "opportunity_verification"] } },
    { status },
    { new: true }
  );

  if (!submission) throw notFound("Submission not found");

  // If it's an opportunity verification, update the user's profile
  if (submission.kind === "opportunity_verification" && submission.user) {
    const profileStatus = status === "verified" ? "verified" : status === "rejected" ? "rejected" : "pending";
    await Profile.findOneAndUpdate(
      { user: submission.user },
      { 
        opportunitiesVerificationStatus: profileStatus,
        opportunitiesVerified: status === "verified"
      }
    );

    // Notify user
    if (status === "verified" || status === "rejected") {
      await Notification.create({
        user: submission.user,
        kind: status === "verified" ? "achievement" : "system",
        title: status === "verified" ? "Opportunities Unlocked!" : "Opportunity Verification Update",
        body: status === "verified" 
          ? "Your portfolio has been verified. You can now unlock opportunities with XP!" 
          : "Your opportunity verification request was not approved. Please update your portfolio and try again.",
        link: "/opportunities",
        dedupeKey: `opp_verify:${submission.user}:${status}:${Date.now()}`
      }).catch(() => null);
    }
  }

  sendSuccess(res, { submission }, "Status updated successfully");
}));

adminUsersRouter.delete("/feedback/:id", asyncHandler(async (req, res) => {
  const isAllowed = req.user.role === "scope_admin" || req.user.role === "scope_super_admin" || req.user.role === "super_admin";
  if (!isAllowed) throw forbidden();

  const submission = await PublicSubmission.findOne({ _id: req.params.id, kind: { $in: ["feedback", "contact", "support_issue", "opportunity_verification"] } });
  if (!submission) throw notFound("Submission not found");

  await PublicSubmission.findByIdAndDelete(req.params.id);
  sendSuccess(res, null, "Submission deleted successfully");
}));

