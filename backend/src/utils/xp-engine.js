import mongoose from "mongoose";
import {
  Application,
  ChallengeParticipation,
  Institution,
  Profile,
  ProfileActivity,
  XpTransaction,
} from "../models/index.js";
import { notFound } from "./errors.js";
import { XP_ACTIONS } from "./xp-constants.js";

export const XP_RULES = {
  signup_bonus: { amount: 120, label: "Welcome bonus" },
  referral_receiver_bonus: { amount: 50, label: "Joined via referral" },
  referral_sender_bonus: { amount: 100, label: "Referral accepted" },
  dashboard_joined_campus: { amount: 30, label: "Joined your campus" },
  dashboard_complete_profile: { amount: 40, label: "Completed your profile" },
  dashboard_first_application: { amount: 50, label: "Applied to first challenge" },
  dashboard_first_portfolio: { amount: 30, label: "Added first portfolio link" },
  event_rsvp: { amount: 30, label: "Reserved an event seat" },
  portfolio_item_created: { amount: 30, label: "Added a portfolio item" },
  project_application_submitted: { amount: 100, label: "Submitted a project application" },
  opportunity_application_submitted: { amount: 20, label: "Submitted an opportunity application" },
  streak_bonus: { amount: 50, label: "Maintained your streak" },
  weekly_mission_claimed: { amount: 60, label: "Completed a weekly mission" },
  achievement_verified_builder: { amount: 100, label: "Achievement Unlocked: Verified Builder" },
  achievement_first_project: { amount: 150, label: "Achievement Unlocked: First Project" },
  achievement_team_player: { amount: 100, label: "Achievement Unlocked: Team Player" },
  manual_adjustment: { amount: 0, label: "XP updated" },
  project_stake_reserved: { amount: 0, label: "Project XP committed" },
  project_stake_refunded: { amount: 0, label: "Project XP commitment refunded" },
  project_reward_granted: { amount: 0, label: "Project reward granted" },
  project_stake_forfeited: { amount: 0, label: "Project XP commitment forfeited" },
  challenge_stake_reserved: { amount: 0, label: "Challenge XP staked" },
  challenge_stake_refunded: { amount: 0, label: "Challenge XP stake refunded" },
  challenge_stake_forfeited: { amount: 0, label: "Challenge XP stake forfeited" },
  challenge_reward_granted: { amount: 0, label: "Challenge reward granted" },
};

const BUCKETS = ["activity", "execution", "reputation"];
const MINT_CAP_RATIO = 0.1;
const MIN_BOOTSTRAP_MINT_CAP = 25;

export function levelFromXp(xp) {
  if (xp >= 6500) return 5;
  if (xp >= 3500) return 4;
  if (xp >= 1500) return 3;
  if (xp >= 500) return 2;
  return 1;
}

export function difficultyMultiplierFor(difficulty) {
  const normalized = String(difficulty || "").trim().toLowerCase();
  if (["advanced", "hard"].includes(normalized)) return 2;
  if (["intermediate", "medium"].includes(normalized)) return 1.5;
  return 1;
}

export function computeStakeReward({ stake = 0, difficulty, quality = 0 }) {
  const safeStake = Math.max(0, Number(stake) || 0);
  const normalizedQuality = Math.min(100, Math.max(0, Number(quality) || 0));
  const reward = safeStake * difficultyMultiplierFor(difficulty) * (0.5 + normalizedQuality / 100);
  const capped = Math.min(reward, safeStake * 2.5);
  return Math.max(0, Math.floor(capped));
}

export function computeTeamRewardPool({ teamSize = 0, stake = 0, difficulty }) {
  const safeTeamSize = Math.max(0, Number(teamSize) || 0);
  const safeStake = Math.max(0, Number(stake) || 0);
  return Math.max(0, Math.floor(safeTeamSize * safeStake * difficultyMultiplierFor(difficulty)));
}

export function distributeProjectRewards({
  participants = [],
  stake = 0,
  difficulty,
  explicitPoolXp = 0,
  minimumContributionScore = 0,
}) {
  const eligible = participants.filter((participant) => (
    participant.rewardEligible
      || (participant.contributionScore?.total || 0) >= minimumContributionScore
  ));

  if (!eligible.length) {
    return { eligibleIds: new Set(), pool: 0, rewards: new Map() };
  }

  const teamSize = Math.max(eligible.length, participants.length || 0);
  const pool = explicitPoolXp > 0
    ? Math.floor(explicitPoolXp)
    : (eligible.length === 1
      ? computeStakeReward({
        stake,
        difficulty,
        quality: eligible[0].contributionScore?.total || 0,
      })
      : computeTeamRewardPool({ teamSize, stake, difficulty }));

  const rewards = new Map();
  const eligibleIds = new Set(eligible.map((participant) => participant.id));

  if (pool <= 0) {
    return { eligibleIds, pool: 0, rewards };
  }

  const totalContribution = eligible.reduce(
    (sum, participant) => sum + Math.max(0, participant.contributionScore?.total || 0),
    0,
  );

  if (eligible.length === 1) {
    rewards.set(eligible[0].id, pool);
    return { eligibleIds, pool, rewards };
  }

  if (totalContribution <= 0) {
    const equalShare = Math.floor(pool / eligible.length);
    let remainder = pool - equalShare * eligible.length;
    eligible.forEach((participant, index) => {
      rewards.set(participant.id, equalShare + (index < remainder ? 1 : 0));
    });
    return { eligibleIds, pool, rewards };
  }

  let allocated = 0;
  const ranked = [...eligible].sort(
    (a, b) => (b.contributionScore?.total || 0) - (a.contributionScore?.total || 0),
  );

  ranked.forEach((participant) => {
    const score = Math.max(0, participant.contributionScore?.total || 0);
    const reward = Math.floor((pool * score) / totalContribution);
    rewards.set(participant.id, reward);
    allocated += reward;
  });

  let remainder = pool - allocated;
  for (const participant of ranked) {
    if (remainder <= 0) break;
    rewards.set(participant.id, (rewards.get(participant.id) || 0) + 1);
    remainder -= 1;
  }

  return { eligibleIds, pool, rewards };
}

function toObjectId(id) {
  if (!id) return null;
  return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));
}

function normalizeBucket(bucket) {
  if (BUCKETS.includes(bucket)) return bucket;
  return "activity";
}

function resolveBucket({ bucket, rule, action, sourceType }) {
  if (bucket) return normalizeBucket(bucket);
  if (
    action === XP_ACTIONS.PROJECT_REWARD_GRANTED
    || action === XP_ACTIONS.CHALLENGE_REWARD_GRANTED
    || rule === "project_reward_granted"
    || rule === "challenge_reward_granted"
    || sourceType === "project_reward"
    || sourceType === "challenge_reward"
  ) {
    return "execution";
  }
  if (String(rule || "").startsWith("achievement_")) return "reputation";
  return "activity";
}

function ensureLifetimeBaseline(profile) {
  const currentBalance = (profile.xp || 0) + (profile.reservedXp || 0);
  return Math.max(profile.xpLifetime || 0, currentBalance);
}

function applyBucketAward(profile, bucket, amount) {
  if (amount <= 0) return;
  profile.xpLifetime = ensureLifetimeBaseline(profile) + amount;
  if (bucket === "activity") profile.xpActivity = (profile.xpActivity || 0) + amount;
  if (bucket === "execution") profile.xpExecution = (profile.xpExecution || 0) + amount;
  if (bucket === "reputation") profile.xpReputation = (profile.xpReputation || 0) + amount;
}

export function buildXpWallet(profile, institution = null) {
  return {
    available: profile?.xp || 0,
    locked: profile?.reservedXp || 0,
    lifetime: Math.max(profile?.xpLifetime || 0, (profile?.xp || 0) + (profile?.reservedXp || 0)),
    activity: profile?.xpActivity || 0,
    execution: profile?.xpExecution || 0,
    reputation: profile?.xpReputation || 0,
    reliability_score: profile?.reliabilityScore ?? 100,
    contribution_average: profile?.contributionAverage || 0,
    active_projects: profile?.activeProjects || 0,
    completed_projects: profile?.completedProjects || 0,
    challenge_score: profile?.challengeScore || 0,
    cooldown_until: profile?.cooldownUntil || null,
    institution_treasury: institution
      ? {
        treasury: institution.treasury || 0,
        allocated: institution.treasuryAllocated || 0,
        used: institution.treasuryUsed || 0,
        carry_forward: institution.treasuryCarryForward || 0,
      }
      : null,
  };
}

async function findProfileOrThrow(userId) {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw notFound("Profile not found");
  return profile;
}

function resolveRule(rule, amountOverride) {
  const config = XP_RULES[rule] || XP_RULES.manual_adjustment;
  const amount = amountOverride ?? config.amount ?? 0;
  return {
    amount,
    label: config.label || "XP updated",
  };
}

async function resolveMintCap(amount) {
  if (amount <= 0) {
    return {
      amount,
      originalAmount: amount,
      wasCapped: false,
      mintedCap: amount,
      circulatingXp: 0,
    };
  }

  const [totals] = await Profile.aggregate([
    {
      $group: {
        _id: null,
        available: { $sum: "$xp" },
        locked: { $sum: "$reservedXp" },
      },
    },
  ]);

  const circulatingXp = (totals?.available || 0) + (totals?.locked || 0);
  const mintedCap = circulatingXp > 0
    ? Math.max(MIN_BOOTSTRAP_MINT_CAP, Math.floor(circulatingXp * MINT_CAP_RATIO))
    : amount;
  const cappedAmount = Math.min(amount, mintedCap);

  return {
    amount: cappedAmount,
    originalAmount: amount,
    wasCapped: cappedAmount !== amount,
    mintedCap,
    circulatingXp,
  };
}

async function recordTransaction({
  userId,
  sourceType = "system",
  sourceId = "system",
  action = XP_ACTIONS.ADMIN_ADJUSTMENT,
  amount,
  balanceBefore,
  balanceAfter,
  status = "completed",
  meta = {},
}) {
  return XpTransaction.create({
    user_id: userId,
    source_type: sourceType,
    source_id: String(sourceId || "system"),
    action,
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    status,
    meta,
  }).catch(() => null);
}

export async function awardXp({
  userId,
  institutionId = null,
  rule,
  amountOverride,
  dedupeKey,
  meta = {},
  text,
  sourceType = "system",
  sourceId = "system",
  action = XP_ACTIONS.ADMIN_ADJUSTMENT,
  bucket,
  enforceMintCap = false,
}) {
  if (dedupeKey) {
    const existing = await ProfileActivity.findOne({
      user: userId,
      kind: "xp_ledger",
      "meta.dedupe_key": dedupeKey,
    }).select("_id");

    if (existing) {
      const profile = await findProfileOrThrow(userId);
      return { awarded: 0, skipped: true, xp: profile.xp || 0, level: profile.level || 1 };
    }
  }

  const profile = await findProfileOrThrow(userId);
  const { amount: rawAmount, label } = resolveRule(rule, amountOverride);
  const bucketName = resolveBucket({ bucket, rule, action, sourceType });
  const capped = enforceMintCap ? await resolveMintCap(rawAmount) : {
    amount: rawAmount,
    originalAmount: rawAmount,
    wasCapped: false,
    mintedCap: null,
    circulatingXp: null,
  };
  const amount = capped.amount;
  const balanceBefore = profile.xp || 0;

  profile.xp = Math.max(0, balanceBefore + amount);
  profile.level = levelFromXp(profile.xp);
  applyBucketAward(profile, bucketName, Math.max(0, amount));
  await profile.save();

  if (institutionId && amount !== 0) {
    await Institution.findByIdAndUpdate(institutionId, { $inc: { totalStudentXp: amount } }).catch(() => null);
  }

  const wallet = buildXpWallet(profile);
  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `${label}: ${amount >= 0 ? "+" : ""}${amount} XP`,
    meta: {
      rule,
      amount,
      balance_before: balanceBefore,
      balance_after: profile.xp,
      level_after: profile.level,
      bucket: bucketName,
      wallet_after: wallet,
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      ...(capped.wasCapped
        ? {
          minted_cap_applied: true,
          minted_cap_value: capped.mintedCap,
          circulating_xp: capped.circulatingXp,
          requested_amount: capped.originalAmount,
        }
        : {}),
      ...meta,
    },
  }).catch(() => null);

  await recordTransaction({
    userId,
    sourceType,
    sourceId,
    action,
    amount,
    balanceBefore,
    balanceAfter: profile.xp,
    meta: {
      rule,
      bucket: bucketName,
      wallet_after: wallet,
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      ...(capped.wasCapped
        ? {
          minted_cap_applied: true,
          minted_cap_value: capped.mintedCap,
          circulating_xp: capped.circulatingXp,
          requested_amount: capped.originalAmount,
        }
        : {}),
      ...meta,
    },
  });

  return { awarded: amount, skipped: false, xp: profile.xp, level: profile.level, wallet };
}

export async function revokeXp({
  userId,
  institutionId = null,
  rule,
  amountOverride,
  meta = {},
  text,
  sourceType = "system",
  sourceId = "system",
  action = XP_ACTIONS.ADMIN_ADJUSTMENT,
}) {
  const profile = await findProfileOrThrow(userId);
  const { amount, label } = resolveRule(rule, amountOverride);
  const penalty = Math.max(0, amount);
  const actualRemoved = Math.min(profile.xp || 0, penalty);
  const balanceBefore = profile.xp || 0;

  profile.xp = Math.max(0, balanceBefore - penalty);
  profile.level = levelFromXp(profile.xp);
  await profile.save();

  if (institutionId && actualRemoved !== 0) {
    await Institution.findByIdAndUpdate(institutionId, { $inc: { totalStudentXp: -actualRemoved } }).catch(() => null);
  }

  const wallet = buildXpWallet(profile);
  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `${label} reversed (-${actualRemoved} XP)`,
    meta: {
      rule,
      amount: -actualRemoved,
      balance_before: balanceBefore,
      balance_after: profile.xp,
      level_after: profile.level,
      wallet_after: wallet,
      ...meta,
    },
  }).catch(() => null);

  await recordTransaction({
    userId,
    sourceType,
    sourceId,
    action,
    amount: -actualRemoved,
    balanceBefore,
    balanceAfter: profile.xp,
    meta: { rule, wallet_after: wallet, ...meta },
  });

  return { removed: actualRemoved, xp: profile.xp, level: profile.level, wallet };
}

export async function reserveXp({
  userId,
  institutionId = null,
  amount,
  sourceType,
  sourceId,
  action = XP_ACTIONS.PROJECT_STAKE_RESERVED,
  dedupeKey,
  meta = {},
  text,
}) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const profile = await findProfileOrThrow(userId);
  if (dedupeKey) {
    const existing = await XpTransaction.findOne({
      user_id: userId,
      action,
      "meta.dedupe_key": dedupeKey,
    }).select("_id");
    if (existing) {
      return {
        reserved: 0,
        skipped: true,
        xp: profile.xp || 0,
        reserved_xp: profile.reservedXp || 0,
        wallet: buildXpWallet(profile),
      };
    }
  }

  if ((profile.xp || 0) < safeAmount) {
    const error = new Error("Not enough available XP to commit");
    error.status = 403;
    error.code = "INSUFFICIENT_XP";
    error.details = { current_xp: profile.xp || 0, required_xp: safeAmount };
    throw error;
  }

  const balanceBefore = profile.xp || 0;
  profile.xp = balanceBefore - safeAmount;
  profile.reservedXp = (profile.reservedXp || 0) + safeAmount;
  profile.level = levelFromXp(profile.xp);
  await profile.save();

  if (institutionId && safeAmount !== 0) {
    await Institution.findByIdAndUpdate(institutionId, { $inc: { totalStudentXp: -safeAmount } }).catch(() => null);
  }

  const wallet = buildXpWallet(profile);
  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `Committed ${safeAmount} XP`,
    meta: {
      rule: "xp_reserved",
      amount: -safeAmount,
      balance_before: balanceBefore,
      balance_after: profile.xp,
      reserved_xp_after: profile.reservedXp,
      wallet_after: wallet,
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      ...meta,
    },
  }).catch(() => null);

  await recordTransaction({
    userId,
    sourceType,
    sourceId,
    action,
    amount: -safeAmount,
    balanceBefore,
    balanceAfter: profile.xp,
    meta: {
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      reserved_xp_after: profile.reservedXp,
      wallet_after: wallet,
      ...meta,
    },
  });

  return { reserved: safeAmount, skipped: false, xp: profile.xp, reserved_xp: profile.reservedXp, wallet };
}

export async function refundReservedXp({
  userId,
  institutionId = null,
  amount,
  sourceType,
  sourceId,
  action = XP_ACTIONS.PROJECT_STAKE_REFUNDED,
  meta = {},
  text,
}) {
  const requested = Math.max(0, Number(amount) || 0);
  const profile = await findProfileOrThrow(userId);
  const refundable = Math.min(profile.reservedXp || 0, requested);
  const balanceBefore = profile.xp || 0;

  profile.reservedXp = Math.max(0, (profile.reservedXp || 0) - refundable);
  profile.xp = balanceBefore + refundable;
  profile.level = levelFromXp(profile.xp);
  await profile.save();

  if (institutionId && refundable !== 0) {
    await Institution.findByIdAndUpdate(institutionId, { $inc: { totalStudentXp: refundable } }).catch(() => null);
  }

  const wallet = buildXpWallet(profile);
  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `Refunded ${refundable} committed XP`,
    meta: {
      rule: "xp_refunded",
      amount: refundable,
      balance_before: balanceBefore,
      balance_after: profile.xp,
      reserved_xp_after: profile.reservedXp,
      wallet_after: wallet,
      ...meta,
    },
  }).catch(() => null);

  await recordTransaction({
    userId,
    sourceType,
    sourceId,
    action,
    amount: refundable,
    balanceBefore,
    balanceAfter: profile.xp,
    meta: { reserved_xp_after: profile.reservedXp, wallet_after: wallet, ...meta },
  });

  return { refunded: refundable, xp: profile.xp, reserved_xp: profile.reservedXp, wallet };
}

export async function forfeitReservedXp({
  userId,
  amount,
  sourceType,
  sourceId,
  action = XP_ACTIONS.PROJECT_STAKE_FORFEITED,
  meta = {},
  text,
}) {
  const requested = Math.max(0, Number(amount) || 0);
  const profile = await findProfileOrThrow(userId);
  const forfeited = Math.min(profile.reservedXp || 0, requested);
  const balanceBefore = profile.xp || 0;

  profile.reservedXp = Math.max(0, (profile.reservedXp || 0) - forfeited);
  await profile.save();

  const wallet = buildXpWallet(profile);
  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `Forfeited ${forfeited} committed XP`,
    meta: {
      rule: "xp_forfeited",
      amount: -forfeited,
      balance_before: balanceBefore,
      balance_after: profile.xp || 0,
      reserved_xp_after: profile.reservedXp,
      wallet_after: wallet,
      ...meta,
    },
  }).catch(() => null);

  await recordTransaction({
    userId,
    sourceType,
    sourceId,
    action,
    amount: -forfeited,
    balanceBefore,
    balanceAfter: profile.xp || 0,
    meta: { reserved_xp_after: profile.reservedXp, wallet_after: wallet, ...meta },
  });

  return { forfeited, xp: profile.xp || 0, reserved_xp: profile.reservedXp, wallet };
}

export async function adjustReliabilityScore(userId, delta) {
  const profile = await findProfileOrThrow(userId);
  profile.reliabilityScore = Math.min(100, Math.max(0, (profile.reliabilityScore ?? 100) + (Number(delta) || 0)));
  await profile.save();
  return profile.reliabilityScore;
}

export async function adjustProjectCounters(userId, { activeDelta = 0, completedDelta = 0 } = {}) {
  const profile = await findProfileOrThrow(userId);
  profile.activeProjects = Math.max(0, (profile.activeProjects || 0) + (Number(activeDelta) || 0));
  profile.completedProjects = Math.max(0, (profile.completedProjects || 0) + (Number(completedDelta) || 0));
  await profile.save();
  return {
    active_projects: profile.activeProjects,
    completed_projects: profile.completedProjects,
  };
}

export async function refreshContributionAverage(userId) {
  const objectId = toObjectId(userId);
  if (!objectId) return 0;

  const [aggregate] = await Application.aggregate([
    {
      $match: {
        user: objectId,
        "contributionScore.total": { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$contributionScore.total" },
      },
    },
  ]);

  const contributionAverage = Math.round(((aggregate?.average || 0) + Number.EPSILON) * 100) / 100;
  await Profile.findOneAndUpdate(
    { user: objectId },
    { $set: { contributionAverage } },
  ).catch(() => null);
  return contributionAverage;
}

export async function refreshChallengeScore(userId) {
  const objectId = toObjectId(userId);
  if (!objectId) return 0;

  const [aggregate] = await ChallengeParticipation.aggregate([
    {
      $match: {
        user: objectId,
        status: "scored",
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$score" },
      },
    },
  ]);

  const challengeScore = Math.round(((aggregate?.average || 0) + Number.EPSILON) * 100) / 100;
  await Profile.findOneAndUpdate(
    { user: objectId },
    { $set: { challengeScore } },
  ).catch(() => null);
  return challengeScore;
}
