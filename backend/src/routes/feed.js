import express from "express";
import { z } from "zod";
import { FeedPost, User, Profile, Institution } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";

export const feedRouter = express.Router();

const createSchema = z.object({ content: z.string().min(1).max(5000), type: z.string().max(80).optional() });
const commentSchema = z.object({ text: z.string().min(1).max(1000) });
const reactionSchema = z.object({ reaction: z.enum(["like", "celebrate"]) });

feedRouter.use(authMiddleware);

function serializePost(post, meId) {
  const liked = post.likes.some((id) => id.toString() === meId);
  const celebrated = post.celebrates.some((id) => id.toString() === meId);
  return {
    id: post.id,
    author: post.authorName,
    campus: post.campus || "",
    time: new Date(post.createdAt).toLocaleDateString(),
    type: post.type || "Update",
    content: post.content,
    likes: post.likes.length,
    celebrates: post.celebrates.length,
    comments: post.comments.length,
    userLiked: liked,
    userCelebrated: celebrated,
    commentList: post.comments.map((c) => ({ id: c._id.toString(), author: c.authorName, text: c.text, at: c.createdAt.getTime() })),
  };
}

feedRouter.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.scope === "campus") {
    if (req.user.institution) {
      filter.user = { $in: (await User.find({ institution: req.user.institution }).select("_id")).map((u) => u._id) };
    } else {
      filter.user = null;
    }
  }
  const posts = await FeedPost.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit || 100), 200));
  sendSuccess(res, { items: posts.map((post) => serializePost(post, req.user.id)), next_cursor: null, has_more: false });
}));

feedRouter.post("/", validate(createSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const profile = await Profile.findOne({ user: req.user._id }).populate("institution");
  const campus = profile?.institution?.name || (req.user.institution ? (await Institution.findById(req.user.institution))?.name : "") || "";
  const post = await FeedPost.create({
    user: req.user._id,
    authorName: user?.name || req.user.email || "Scope User",
    campus,
    type: req.body.type || "Update",
    content: req.body.content,
    likes: [],
    celebrates: [],
    comments: [],
  });
  sendSuccess(res, { post: serializePost(post, req.user.id) }, "Post created", 201);
}));

feedRouter.post("/:id/react", validate(reactionSchema), asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id);
  if (!post) throw notFound("Post not found");
  const mine = req.user._id.toString();
  const key = req.body.reaction === "like" ? "likes" : "celebrates";
  const has = post[key].some((id) => id.toString() === mine);
  if (has) post[key] = post[key].filter((id) => id.toString() !== mine);
  else post[key].push(req.user._id);
  await post.save();
  sendSuccess(res, { post: serializePost(post, req.user.id) });
}));

feedRouter.post("/:id/comment", validate(commentSchema), asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id);
  if (!post) throw notFound("Post not found");
  const user = await User.findById(req.user._id);
  post.comments.push({ user: req.user._id, authorName: user?.name || req.user.email || "Scope User", text: req.body.text });
  await post.save();
  sendSuccess(res, { post: serializePost(post, req.user.id) }, "Comment added", 201);
}));
