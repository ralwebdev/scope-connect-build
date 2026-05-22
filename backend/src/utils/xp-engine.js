import { Institution, Profile, ProfileActivity, XpTransaction } from "../models/index.js";
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
  challenge_reward_granted: { amount: 0, label: "Challenge reward granted" },
};

export function levelFromXp(xp) {
  if (xp >= 6500) return 5;
  if (xp >= 3500) return 4;
  if (xp >= 1500) return 3;
  if (xp >= 500) return 2;
  return 1;
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
  const { amount, label } = resolveRule(rule, amountOverride);
  const balanceBefore = profile.xp || 0;

  profile.xp = Math.max(0, balanceBefore + amount);
  profile.level = levelFromXp(profile.xp);
  await profile.save();

  if (institutionId && amount !== 0) {
    await Institution.findByIdAndUpdate(institutionId, { $inc: { totalStudentXp: amount } }).catch(() => null);
  }

  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `${label} · ${amount >= 0 ? "+" : ""}${amount} XP`,
    meta: {
      rule,
      amount,
      balance_before: balanceBefore,
      balance_after: profile.xp,
      level_after: profile.level,
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
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
    meta: { rule, ...(dedupeKey ? { dedupe_key: dedupeKey } : {}), ...meta },
  });

  return { awarded: amount, skipped: false, xp: profile.xp, level: profile.level };
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

  await ProfileActivity.create({
    user: userId,
    kind: "xp_ledger",
    text: text || `${label} reversed · -${actualRemoved} XP`,
    meta: {
      rule,
      amount: -actualRemoved,
      balance_before: balanceBefore,
      balance_after: profile.xp,
      level_after: profile.level,
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
    meta: { rule, ...meta },
  });

  return { removed: actualRemoved, xp: profile.xp, level: profile.level };
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
    if (existing) return { reserved: 0, skipped: true, xp: profile.xp || 0, reserved_xp: profile.reservedXp || 0 };
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
    meta: { ...(dedupeKey ? { dedupe_key: dedupeKey } : {}), reserved_xp_after: profile.reservedXp, ...meta },
  });

  return { reserved: safeAmount, skipped: false, xp: profile.xp, reserved_xp: profile.reservedXp };
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
    meta: { reserved_xp_after: profile.reservedXp, ...meta },
  });

  return { refunded: refundable, xp: profile.xp, reserved_xp: profile.reservedXp };
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
    meta: { reserved_xp_after: profile.reservedXp, ...meta },
  });

  return { forfeited, xp: profile.xp || 0, reserved_xp: profile.reservedXp };
}
