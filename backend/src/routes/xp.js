import express from "express";
import { z } from "zod";
import { Institution, Profile, XpTransaction } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { buildXpWallet } from "../utils/xp-engine.js";
import { XP_ACTIONS } from "../utils/xp-constants.js";
import { validate } from "../utils/validate.js";

export const xpRouter = express.Router();

xpRouter.use(authMiddleware);

const STAKE_ACTIONS = [
  XP_ACTIONS.PROJECT_STAKE_RESERVED,
  XP_ACTIONS.PROJECT_STAKE_REFUNDED,
  XP_ACTIONS.PROJECT_STAKE_FORFEITED,
  XP_ACTIONS.CHALLENGE_STAKE_RESERVED,
  XP_ACTIONS.CHALLENGE_STAKE_REFUNDED,
  XP_ACTIONS.CHALLENGE_STAKE_FORFEITED,
];

const REWARD_ACTIONS = [
  XP_ACTIONS.PROJECT_REWARD_GRANTED,
  XP_ACTIONS.CHALLENGE_REWARD_GRANTED,
];

const transactionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  bucket: z.enum(["all", "stakes", "rewards", "adjustments"]).optional().default("all"),
});

function serializeTransaction(item) {
  return {
    id: item.id,
    action: item.action,
    amount: item.amount,
    source_type: item.source_type,
    source_id: item.source_id,
    balance_before: item.balance_before,
    balance_after: item.balance_after,
    status: item.status,
    meta: item.meta || {},
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function dedupeTransactions(items, limit) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const dedupeKey = typeof item.meta?.dedupe_key === "string" ? item.meta.dedupe_key : "";
    const minuteBucket = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 16) : "";
    const signature = dedupeKey || [
      item.action,
      item.source_type,
      item.source_id,
      item.amount,
      item.balance_before,
      item.balance_after,
      item.meta?.rule || "",
      minuteBucket,
    ].join("|");

    if (seen.has(signature)) continue;
    seen.add(signature);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

async function loadProfileWithInstitution(userId) {
  const profile = await Profile.findOne({ user: userId }).populate("institution");
  if (!profile) throw notFound("Profile not found");

  const institution = profile.institution?._id
    ? await Institution.findById(profile.institution._id).select(
      "treasury treasuryAllocated treasuryUsed treasuryCarryForward",
    )
    : null;

  return { profile, institution };
}

function transactionFilterFor(userId, bucket) {
  const filter = { user_id: reqUserId(userId) };

  if (bucket === "stakes") {
    filter.action = { $in: STAKE_ACTIONS };
  } else if (bucket === "rewards") {
    filter.action = { $in: REWARD_ACTIONS };
  } else if (bucket === "adjustments") {
    filter.action = { $nin: [...STAKE_ACTIONS, ...REWARD_ACTIONS] };
  }

  return filter;
}

function reqUserId(userId) {
  return userId?._id ? userId._id : userId;
}

xpRouter.get("/", asyncHandler(async (req, res) => {
  const { profile, institution } = await loadProfileWithInstitution(req.user._id);

  const [ledger, stakeHistory, rewardHistory] = await Promise.all([
    XpTransaction.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(100),
    XpTransaction.find({
      user_id: req.user._id,
      action: {
        $in: [
          XP_ACTIONS.PROJECT_STAKE_RESERVED,
          XP_ACTIONS.PROJECT_STAKE_REFUNDED,
          XP_ACTIONS.PROJECT_STAKE_FORFEITED,
          XP_ACTIONS.CHALLENGE_STAKE_RESERVED,
          XP_ACTIONS.CHALLENGE_STAKE_REFUNDED,
          XP_ACTIONS.CHALLENGE_STAKE_FORFEITED,
        ],
      },
    }).sort({ createdAt: -1 }).limit(100),
    XpTransaction.find({
      user_id: req.user._id,
      action: {
        $in: [
          XP_ACTIONS.PROJECT_REWARD_GRANTED,
          XP_ACTIONS.CHALLENGE_REWARD_GRANTED,
        ],
      },
    }).sort({ createdAt: -1 }).limit(100),
  ]);

  sendSuccess(res, {
    wallet: buildXpWallet(profile, institution),
    ledger: ledger.map(serializeTransaction),
    stake_history: stakeHistory.map(serializeTransaction),
    reward_history: rewardHistory.map(serializeTransaction),
  });
}));

xpRouter.get(
  "/transactions",
  validate(transactionQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { limit, bucket } = req.query;
    const { profile, institution } = await loadProfileWithInstitution(req.user._id);
    const rawItems = await XpTransaction.find(transactionFilterFor(req.user._id, bucket))
      .sort({ createdAt: -1 })
      .limit(limit * 5);
    const items = dedupeTransactions(rawItems, limit);

    sendSuccess(res, {
      wallet: buildXpWallet(profile, institution),
      items: items.map(serializeTransaction),
      filters: { limit, bucket },
    });
  }),
);
