import { PortfolioItem, ProfileActivity } from "../models/index.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { serializePortfolioItem } from "../utils/serializers.js";
import { awardXp } from "../utils/xp-engine.js";

async function logProfileActivity(userId, kind, text, meta = {}) {
  await ProfileActivity.create({ user: userId, kind, text, meta }).catch(() => null);
}

function buildUpdatePatch(body) {
  return {
    ...(body.type !== undefined && { type: body.type }),
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.skills !== undefined && { skills: body.skills }),
    ...(body.link !== undefined && { link: body.link || "" }),
    ...(body.cover !== undefined && { cover: body.cover }),
  };
}

export async function listMyPortfolioItems(req, res) {
  const items = await PortfolioItem.find({ user: req.user._id }).sort({ createdAt: -1 });
  sendSuccess(res, {
    items: items.map((item) => serializePortfolioItem(item, req.user.id)),
    next_cursor: null,
    has_more: false,
  });
}

export async function createPortfolioItem(req, res) {
  const item = await PortfolioItem.create({
    user: req.user._id,
    type: req.body.type,
    title: req.body.title,
    description: req.body.description,
    skills: req.body.skills,
    link: req.body.link || "",
    cover: req.body.cover,
  });

  await awardXp({
    userId: req.user._id,
    institutionId: req.user.institution || null,
    rule: "portfolio_item_created",
    dedupeKey: `portfolio_item:${item.id}`,
    meta: {
      portfolio_item_id: item.id,
      portfolio_item_type: item.type,
    },
    text: `Added portfolio item: ${item.title} · +30 XP`,
  }).catch(() => null);
  await logProfileActivity(req.user._id, "portfolio_item_created", `Added portfolio item: ${item.title}`, {
    portfolio_item_id: item.id,
    portfolio_item_type: item.type,
  });

  sendSuccess(res, { item: serializePortfolioItem(item, req.user.id) }, "Portfolio item created", 201);
}

export async function updatePortfolioItem(req, res) {
  const item = await PortfolioItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) throw notFound("Portfolio item not found");

  Object.assign(item, buildUpdatePatch(req.body));
  await item.save();

  await logProfileActivity(req.user._id, "portfolio_item_updated", `Updated portfolio item: ${item.title}`, {
    portfolio_item_id: item.id,
    portfolio_item_type: item.type,
  });

  sendSuccess(res, { item: serializePortfolioItem(item, req.user.id) });
}

export async function removePortfolioItem(req, res) {
  const item = await PortfolioItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!item) throw notFound("Portfolio item not found");

  await logProfileActivity(req.user._id, "portfolio_item_deleted", `Removed portfolio item: ${item.title}`, {
    portfolio_item_id: item.id,
    portfolio_item_type: item.type,
  });

  sendSuccess(res, null);
}
