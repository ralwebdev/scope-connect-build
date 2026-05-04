import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, Profile, PortfolioLink, Session } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { parsePagination, cursorFilter } from "../utils/pagination.js";
import { deriveRoleFromEmail, roles, roleVariants } from "../utils/roles.js";
import { serializeUser } from "../utils/serializers.js";

export const usersRouter = express.Router();
export const adminUsersRouter = express.Router();

const url = z.string().url().regex(/^https?:\/\//).nullable().optional();

const patchUserSchema = z.object({
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
  send_invite: z.boolean().optional().default(false),
  password: z.string().min(8).max(128).optional(),
});

const adminPatchSchema = z.object({
  role: z.enum(roles).optional(),
  role_variant: z.enum(roleVariants).optional(),
  disabled_at: z.string().datetime().nullable().optional(),
  founder: z.boolean().optional(),
});

async function findHydratedUser(id) {
  return User.findById(id).populate({ path: "profile", populate: { path: "institution" } });
}

usersRouter.use(authMiddleware);

usersRouter.get("/", requirePermission("manage_users"), asyncHandler(async (req, res) => {
  const { limit, cursor, sort } = parsePagination(req.query, ["createdAt"]);
  const filter = { ...cursorFilter(cursor, sort) };
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

usersRouter.get("/:id", asyncHandler(async (req, res) => {
  const user = await findHydratedUser(req.params.id);
  if (!user) throw notFound("User not found");
  const includePrivate = req.user.id === user.id || req.user.role === "super_admin";
  sendSuccess(res, { user: await serializeUser(user, { includePrivate }) });
}));

usersRouter.patch("/:id", validate(patchUserSchema), asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== "super_admin") throw forbidden();
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");
  if (req.body.name) user.name = req.body.name;
  await user.save();

  const profile = await Profile.findOneAndUpdate(
    { user: user._id },
    {
      ...(req.body.handle !== undefined && { handle: req.body.handle }),
      ...(req.body.headline !== undefined && { headline: req.body.headline }),
      ...(req.body.bio !== undefined && { bio: req.body.bio }),
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
  sendSuccess(res, { user: await serializeUser(await findHydratedUser(req.user._id), { includePrivate: true }) });
}));

adminUsersRouter.use(authMiddleware, requirePermission("manage_users"));

adminUsersRouter.post("/", validate(adminCreateSchema), asyncHandler(async (req, res) => {
  const existing = await User.findOne({ email: req.body.email.toLowerCase() });
  if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
  const inviteToken = req.body.send_invite ? crypto.randomUUID?.() || `${Date.now()}` : null;
  const derived = deriveRoleFromEmail(req.body.email, req.body.role);
  const user = await User.create({
    email: req.body.email,
    name: req.body.name,
    passwordHash: await bcrypt.hash(req.body.password || inviteToken || "ChangeMe123!", 12),
    role: req.body.role || derived.role,
    roleVariant: req.body.role_variant || derived.roleVariant,
    founder: derived.founder,
  });
  await Profile.create({ user: user._id, handle: user.email.split("@")[0].replace(/[^a-z0-9-]/gi, "-") });
  sendSuccess(res, {
    user: await serializeUser(await findHydratedUser(user._id), { includePrivate: true }),
    invite_token: inviteToken,
  }, "User created", 201);
}));

adminUsersRouter.patch("/:id", validate(adminPatchSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("User not found");
  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.role_variant !== undefined) user.roleVariant = req.body.role_variant;
  if (req.body.disabled_at !== undefined) user.disabledAt = req.body.disabled_at ? new Date(req.body.disabled_at) : null;
  if (req.body.founder !== undefined) user.founder = req.body.founder;
  await user.save();
  if (user.disabledAt) await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  sendSuccess(res, { user: await serializeUser(await findHydratedUser(user._id), { includePrivate: true }) });
}));
