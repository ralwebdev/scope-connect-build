import { Institution, Profile, ProfileActivity } from "../models/index.js";
import { notFound } from "./errors.js";

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

export async function awardXp({
  userId,
  institutionId = null,
  rule,
  amountOverride,
  dedupeKey,
  meta = {},
  text,
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

  profile.xp = Math.max(0, (profile.xp || 0) + amount);
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
      balance_after: profile.xp,
      level_after: profile.level,
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
      ...meta,
    },
  }).catch(() => null);

  return { awarded: amount, skipped: false, xp: profile.xp, level: profile.level };
}

export async function revokeXp({
  userId,
  institutionId = null,
  rule,
  amountOverride,
  meta = {},
  text,
}) {
  const profile = await findProfileOrThrow(userId);
  const { amount, label } = resolveRule(rule, amountOverride);
  const penalty = Math.max(0, amount);
  const actualRemoved = Math.min(profile.xp || 0, penalty);

  profile.xp = Math.max(0, (profile.xp || 0) - penalty);
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
      balance_after: profile.xp,
      level_after: profile.level,
      ...meta,
    },
  }).catch(() => null);

  return { removed: actualRemoved, xp: profile.xp, level: profile.level };
}
