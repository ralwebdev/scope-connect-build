import express from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { User, Profile, Session, Institution, ProfileActivity } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { deriveRoleFromEmail } from "../utils/roles.js";
import { createRefreshToken, hashRefreshToken, signAccessToken } from "../utils/tokens.js";
import { serializeUser } from "../utils/serializers.js";
import { env } from "../config/env.js";
import { awardXp } from "../utils/xp-engine.js";
import { sendEmail } from "../utils/email.js";

export const authRouter = express.Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  institution_id: z.string().optional(),
  role: z.enum(["student", "scope_admin", "super_admin"]).optional(),
  interests: z.array(z.string().max(80)).optional(),
  referral_code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  role: z.enum(["student", "faculty", "institution_admin", "scope_admin", "super_admin"]).optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(16),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(16).optional(),
  all_sessions: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  password: z.string().min(8).max(128),
});

function handleBaseFromEmail(email) {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return base || `user-${Date.now().toString(36)}`;
}

async function findUserByReferralCode(code) {
  if (!code || typeof code !== "string" || !code.toUpperCase().startsWith("SCOPE-")) return null;
  const targetPrefix = code.replace(/scope-/i, "").toLowerCase();
  if (targetPrefix.length !== 6) return null;

  const users = await User.find({}, "_id");
  const matchingUser = users.find((u) => u._id.toString().slice(2, 8).toLowerCase() === targetPrefix);
  if (!matchingUser) return null;
  return User.findById(matchingUser._id);
}

async function createUniqueHandle(email) {
  const base = handleBaseFromEmail(email);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await Profile.exists({ handle: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function issueSession(req, user) {
  const refreshToken = createRefreshToken();
  await Session.create({
    user: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    expiresAt: new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000),
  });

  return {
    access_token: signAccessToken(user),
    refresh_token: refreshToken,
    access_token_expires_in: env.jwtAccessTtlSeconds,
  };
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

authRouter.post("/signup", authRateLimit, validate(signupSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
  const institution = req.body.institution_id ? await Institution.findById(req.body.institution_id) : null;
  if (req.body.institution_id && !institution) throw new AppError(404, "INSTITUTION_NOT_FOUND", "Institution not found");

  const derived = deriveRoleFromEmail(email, req.body.role);
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    name: req.body.name,
    role: derived.role,
    roleVariant: derived.roleVariant,
    institution: institution?._id ?? null,
    studentStatus: institution && derived.role === "student" ? "pending_verification" : "active",
    founder: derived.founder,
  });

  try {
    let referredByUser = null;

    if (req.body.referral_code) {
      referredByUser = await findUserByReferralCode(req.body.referral_code);
    }

    await Profile.create({
      user: user._id,
      handle: await createUniqueHandle(email),
      institution: institution?._id ?? null,
      skills: [],
      interests: req.body.interests || [],
      availability: "Open to collab",
      avatarColor: "#00D1FF",
      xp: 0,
      level: 1,
      streakDays: 1,
      institutionVerified: false,
    });

    await awardXp({
      userId: user._id,
      institutionId: institution?._id ?? null,
      rule: "signup_bonus",
      dedupeKey: `signup_bonus:${user._id}`,
      meta: { source: "signup" },
      text: "Welcome bonus · +120 XP",
    });

    if (referredByUser && String(referredByUser._id) !== String(user._id)) {
      await awardXp({
        userId: user._id,
        institutionId: institution?._id ?? null,
        rule: "referral_receiver_bonus",
        dedupeKey: `referral_receiver:${user._id}`,
        meta: { referredBy: referredByUser._id },
        text: "Joined via referral · +50 XP",
      });

      await awardXp({
        userId: referredByUser._id,
        institutionId: referredByUser.institution || null,
        rule: "referral_sender_bonus",
        dedupeKey: `referral_sender:${referredByUser._id}:${user._id}`,
        meta: { referredUser: user._id },
        text: "Referral accepted · +100 XP",
      });
    }
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  const tokens = await issueSession(req, user);
  const hydrated = await User.findById(user._id).populate({ path: "profile", populate: { path: "institution" } });
  sendSuccess(res, { user: await serializeUser(hydrated, { includePrivate: true }), ...tokens }, "Signup successful", 201);
}));

authRouter.post("/login", authRateLimit, validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (user.disabledAt) throw new AppError(403, "ACCOUNT_DISABLED", "Account disabled");

  if (req.body.role && user.role !== req.body.role) {
    throw new AppError(403, "ROLE_MISMATCH", `This account is not registered as a ${req.body.role.replace('_', ' ')}`);
  }

  const tokens = await issueSession(req, user);
  const hydrated = await User.findById(user._id).populate({ path: "profile", populate: { path: "institution" } });
  sendSuccess(res, { user: await serializeUser(hydrated, { includePrivate: true }), ...tokens }, "Login successful");
}));

authRouter.post("/refresh", validate(refreshSchema), asyncHandler(async (req, res) => {
  const oldSession = await Session.findOne({
    refreshTokenHash: hashRefreshToken(req.body.refresh_token),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate("user");

  if (!oldSession || !oldSession.user || oldSession.user.disabledAt) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  const refreshToken = createRefreshToken();
  const newSession = await Session.create({
    user: oldSession.user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    expiresAt: new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000),
  });
  oldSession.revokedAt = new Date();
  oldSession.rotatedTo = newSession._id;
  oldSession.lastUsedAt = new Date();
  await oldSession.save();

  sendSuccess(res, {
    access_token: signAccessToken(oldSession.user),
    refresh_token: refreshToken,
    access_token_expires_in: env.jwtAccessTtlSeconds,
  });
}));

authRouter.post("/logout", validate(logoutSchema), asyncHandler(async (req, res) => {
  let revoked = 0;
  if (req.body.refresh_token) {
    const session = await Session.findOne({
      refreshTokenHash: hashRefreshToken(req.body.refresh_token),
      revokedAt: null,
    });
    if (session) {
      if (req.body.all_sessions) {
        const result = await Session.updateMany({ user: session.user, revokedAt: null }, { revokedAt: new Date() });
        revoked = result.modifiedCount;
      } else {
        session.revokedAt = new Date();
        await session.save();
        revoked = 1;
      }
    }
  }
  sendSuccess(res, { revoked });
}));

authRouter.post("/forgot-password", authRateLimit, validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

  if (user && !user.disabledAt) {
    const { token, tokenHash } = createPasswordResetToken();
    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${env.appBaseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = "Reset your Scope Connect password";
    const body = [
      `Hi ${user.name || "there"},`,
      "",
      "We received a request to reset your password.",
      `Use this link to set a new password: ${resetLink}`,
      "",
      "This link expires in 15 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n");

    await sendEmail({ to: user.email, subject, body }).catch((error) => {
      console.error("Forgot password email send failed:", error);
      throw new AppError(500, "EMAIL_SEND_FAILED", "Unable to send reset email right now");
    });
  }

  sendSuccess(res, { sent: true }, "If an account exists, a reset link has been sent");
}));

authRouter.post("/reset-password", authRateLimit, validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const tokenHash = crypto.createHash("sha256").update(req.body.token).digest("hex");
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select("+passwordHash +resetPasswordTokenHash +resetPasswordExpiresAt");

  if (!user) {
    throw new AppError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired");
  }

  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  await Session.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });

  sendSuccess(res, { reset: true }, "Password reset successful");
}));

authRouter.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: "profile", populate: { path: "institution" } });
  sendSuccess(res, { user: await serializeUser(user, { includePrivate: true }) });
}));
