import express from "express";
import { z } from "zod";
import { listChallenges, createChallenge } from "../controllers/challenges.controller.js";
import { Challenge, ChallengeParticipation } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { hasPermission } from "../utils/roles.js";
import { awardXp, reserveXp } from "../utils/xp-engine.js";
import { XP_ACTIONS } from "../utils/xp-constants.js";

export const challengesRouter = express.Router();

const challengeSchema = z.object({
  scope: z.enum(["campus", "global"]),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  seatsTotal: z.number().int().min(1).max(100000),
  reward: z.string().min(1).max(100),
  duration: z.string().max(120).optional(),
  stake_xp: z.number().int().min(0).max(1000000).optional().default(0),
  reward_pool: z.number().int().min(0).max(1000000).optional().default(0),
  evaluation_method: z.string().max(120).optional(),
  submission_format: z.string().max(120).optional(),
  leaderboard: z.boolean().optional().default(true),
});

const submitSchema = z.object({
  url: z.string().max(2000).optional(),
  file_id: z.string().max(200).optional(),
  notes: z.string().max(5000).optional().default(""),
});

const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  badge: z.string().max(120).optional().default(""),
  xp_reward: z.number().int().min(0).max(1000000).optional().default(0),
  certificate_url: z.string().max(2000).optional().default(""),
});

challengesRouter.get("/", authMiddleware, asyncHandler(listChallenges));
challengesRouter.post("/", authMiddleware, requirePermission("manage_projects"), validate(challengeSchema), asyncHandler(createChallenge));

challengesRouter.post("/:id/join", authMiddleware, asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw notFound("Challenge not found");
  if (challenge.seatsFilled >= challenge.seatsTotal) throw new AppError(409, "CHALLENGE_FULL", "This challenge is full");

  const existing = await ChallengeParticipation.findOne({ challenge: challenge._id, user: req.user._id });
  if (existing) throw new AppError(409, "ALREADY_JOINED", "You have already joined this challenge");

  const stake = challenge.stakeXp || 0;
  const participation = await ChallengeParticipation.create({
    challenge: challenge._id,
    user: req.user._id,
    stakeXp: stake,
    status: "joined",
  });

  let xpResult = { xp: null, reserved_xp: null, reserved: 0 };
  if (stake > 0) {
    try {
      xpResult = await reserveXp({
        userId: req.user._id,
        institutionId: req.user.institution || null,
        amount: stake,
        sourceType: "challenge",
        sourceId: challenge._id,
        action: XP_ACTIONS.CHALLENGE_STAKE_RESERVED,
        dedupeKey: `challenge_stake:${participation.id}`,
        meta: { challenge_id: challenge.id, participation_id: participation.id },
        text: `Staked ${stake} XP for challenge: ${challenge.title}`,
      });
    } catch (error) {
      await ChallengeParticipation.deleteOne({ _id: participation._id }).catch(() => null);
      throw error;
    }
  }

  challenge.seatsFilled = Math.min(challenge.seatsTotal, (challenge.seatsFilled || 0) + 1);
  await challenge.save();
  sendSuccess(res, { participation, current_xp: xpResult.xp, reserved_xp: xpResult.reserved_xp }, "Challenge joined", 201);
}));

challengesRouter.post("/:id/submit", authMiddleware, validate(submitSchema), asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw notFound("Challenge not found");
  const participation = await ChallengeParticipation.findOne({ challenge: challenge._id, user: req.user._id });
  if (!participation) throw new AppError(404, "NOT_JOINED", "Join the challenge before submitting");
  participation.submission = {
    url: req.body.url || "",
    fileId: req.body.file_id || "",
    notes: req.body.notes || "",
    submittedAt: new Date(),
  };
  participation.status = "submitted";
  await participation.save();
  sendSuccess(res, { participation }, "Challenge solution submitted");
}));

challengesRouter.patch("/:id/score/:participationId", authMiddleware, requirePermission("manage_projects"), validate(scoreSchema), asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw notFound("Challenge not found");
  if (!hasPermission(req.user, "manage_projects")) throw forbidden();
  const participation = await ChallengeParticipation.findOne({ _id: req.params.participationId, challenge: challenge._id });
  if (!participation) throw notFound("Challenge participation not found");

  participation.score = req.body.score;
  participation.badge = req.body.badge || "";
  participation.xpReward = req.body.xp_reward || 0;
  participation.certificateUrl = req.body.certificate_url || "";
  participation.status = "scored";
  participation.scoredBy = req.user._id;
  participation.scoredAt = new Date();

  if (participation.xpReward > 0) {
    const xpResult = await awardXp({
      userId: participation.user,
      institutionId: req.user.institution || null,
      rule: "challenge_reward_granted",
      amountOverride: participation.xpReward,
      sourceType: "challenge",
      sourceId: challenge._id,
      action: XP_ACTIONS.CHALLENGE_REWARD_GRANTED,
      dedupeKey: `challenge_reward:${participation.id}`,
      meta: { challenge_id: challenge.id, participation_id: participation.id, score: participation.score },
      text: `Challenge reward granted: ${challenge.title}`,
    });
    participation.xpReward = xpResult.awarded;
  }
  await participation.save();

  const ranked = await ChallengeParticipation.find({ challenge: challenge._id, status: "scored" }).sort({ score: -1, scoredAt: 1 });
  for (let index = 0; index < ranked.length; index += 1) {
    ranked[index].rank = index + 1;
    await ranked[index].save();
  }
  const refreshed = await ChallengeParticipation.findById(participation._id);
  sendSuccess(res, { participation: refreshed }, "Challenge scored");
}));

challengesRouter.get("/:id/leaderboard", authMiddleware, asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw notFound("Challenge not found");
  const items = await ChallengeParticipation.find({ challenge: challenge._id, status: "scored" })
    .sort({ rank: 1, score: -1 })
    .populate("user", "name email");
  sendSuccess(res, { items });
}));
