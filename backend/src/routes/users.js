import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AnalyticsEvent, Institution, User, Profile, PortfolioLink, ProfileActivity, Session } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { parsePagination, cursorFilter } from "../utils/pagination.js";
import { deriveRoleFromEmail, hasPermission, roles, roleVariants } from "../utils/roles.js";
import { serializeUser } from "../utils/serializers.js";

export const usersRouter = express.Router();
export const adminUsersRouter = express.Router();

const url = z.string().url().regex(/^https?:\/\//).nullable().optional();

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
  name: z.string().min(1).max(120),
  role: z.enum(roles),
  role_variant: z.enum(roleVariants).optional(),
  institution_id: z.string().optional().nullable(),
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

async function findHydratedUser(id) {
  return User.findById(id).populate({ path: "profile", populate: { path: "institution" } });
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
  return req.user.role === "scope_admin" && req.body.role === "institution_admin" && Boolean(req.body.institution_id);
}
async function logProfileActivity(userId, kind, text, meta = {}) {
  await ProfileActivity.create({ user: userId, kind, text, meta }).catch(() => null);
}

usersRouter.use(authMiddleware);

usersRouter.get("/leaderboard/students", asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "view_dashboard")) throw forbidden();
  const filter = { role: "student", disabledAt: null };
  if (req.query.institution_id) filter.institution = req.query.institution_id;
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(1000);
  const hydrated = await Promise.all(users.map((user) => findHydratedUser(user._id)));
  const items = (await Promise.all(
    hydrated
      .filter(Boolean)
      .map((user) => serializeUser(user, { includePrivate: false })),
  )).sort((a, b) => (b.stats?.xp ?? 0) - (a.stats?.xp ?? 0));
  sendSuccess(res, { items, next_cursor: null, has_more: false });
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
      sub: row.city || "",
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
    if (!canViewInstitutionMembers) throw forbidden();
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
    profile.xp = (profile.xp || 0) + amount;
    awarded += amount;
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

  if (awarded > 0) await profile.save();
  sendSuccess(res, {
    awarded,
    awarded_segments: awardedSegments,
    user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }),
  });
}));

usersRouter.patch("/:id", validate(patchUserSchema), asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== "super_admin") throw forbidden();
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
  const user = await User.create({
    email,
    name: req.body.name,
    passwordHash: await bcrypt.hash(req.body.password || inviteToken, 12),
    role: req.body.role || derived.role,
    roleVariant: roleVariantFor(req.body.role || derived.role, req.body.role_variant),
    institution: institution?._id ?? null,
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

adminUsersRouter.patch("/:id", requirePermission("manage_users"), validate(adminPatchSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");
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
