import express from "express";
import { z } from "zod";
import { PortfolioItem, Profile } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";

export const portfolioItemsRouter = express.Router();

const schema = z.object({
  type: z.enum(["Project", "Design", "Research", "Startup Idea", "Campaign", "Certificate"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  skills: z.array(z.string().max(80)).max(30).optional().default([]),
  link: z.string().url().optional().or(z.literal("")),
  cover: z.string().min(1).max(20),
});

portfolioItemsRouter.use(authMiddleware);

portfolioItemsRouter.get("/me", asyncHandler(async (req, res) => {
  const items = await PortfolioItem.find({ user: req.user._id }).sort({ createdAt: -1 });
  sendSuccess(res, {
    items: items.map((item) => ({
      id: item.id,
      user_id: req.user.id,
      type: item.type,
      title: item.title,
      description: item.description,
      skills: item.skills || [],
      link: item.link || "",
      cover: item.cover,
      created_at: item.createdAt,
    })),
    next_cursor: null,
    has_more: false,
  });
}));

portfolioItemsRouter.post("/", validate(schema), asyncHandler(async (req, res) => {
  const item = await PortfolioItem.create({
    user: req.user._id,
    type: req.body.type,
    title: req.body.title,
    description: req.body.description,
    skills: req.body.skills,
    link: req.body.link || "",
    cover: req.body.cover,
  });
  await Profile.updateOne({ user: req.user._id }, { $inc: { xp: 30 } }).catch(() => null);
  sendSuccess(res, {
    item: {
      id: item.id,
      user_id: req.user.id,
      type: item.type,
      title: item.title,
      description: item.description,
      skills: item.skills || [],
      link: item.link || "",
      cover: item.cover,
      created_at: item.createdAt,
    },
  }, "Portfolio item created", 201);
}));

portfolioItemsRouter.patch("/:id", validate(schema.partial()), asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) throw notFound("Portfolio item not found");
  Object.assign(item, {
    ...(req.body.type !== undefined && { type: req.body.type }),
    ...(req.body.title !== undefined && { title: req.body.title }),
    ...(req.body.description !== undefined && { description: req.body.description }),
    ...(req.body.skills !== undefined && { skills: req.body.skills }),
    ...(req.body.link !== undefined && { link: req.body.link || "" }),
    ...(req.body.cover !== undefined && { cover: req.body.cover }),
  });
  await item.save();
  sendSuccess(res, { item: {
    id: item.id,
    user_id: req.user.id,
    type: item.type,
    title: item.title,
    description: item.description,
    skills: item.skills || [],
    link: item.link || "",
    cover: item.cover,
    created_at: item.createdAt,
  } });
}));

portfolioItemsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!item) throw notFound("Portfolio item not found");
  sendSuccess(res, null);
}));

