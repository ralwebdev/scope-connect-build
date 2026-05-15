import express from "express";
import { z } from "zod";
import { FeedPost, User, Profile, Institution } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";

export const feedRouter = express.Router();

const createSchema = z.object({ 
  content: z.string().max(5000).optional().default(""), 
  type: z.string().max(80).optional(),
  target_institution_id: z.string().optional().nullable(),
  media: z.array(z.object({
    type: z.enum(["image", "video"]),
    url: z.string().url(),
    fileId: z.string().optional()
  })).optional()
}).refine(data => data.content.trim().length > 0 || (data.media && data.media.length > 0), {
  message: "Post must have content or media"
});
const commentSchema = z.object({ text: z.string().min(1).max(1000) });
const reactionSchema = z.object({ reaction: z.enum(["like", "celebrate"]) });

feedRouter.use(authMiddleware);

function isScopeTeam(user) {
  return user.role === "scope_admin" || user.role === "super_admin";
}

function buildFeedVisibilityFilter(user, scope) {
  if (scope === "campus") {
    if (user.institution) {
      return {
        $or: [
          { targetInstitution: user.institution },
          { targetInstitution: null },
        ],
      };
    }
    return { targetInstitution: null };
  }

  if (isScopeTeam(user)) {
    return {};
  }

  if (user.institution) {
    return {
      $or: [
        { targetInstitution: user.institution },
        { targetInstitution: null },
      ],
    };
  }

  return { targetInstitution: null };
}

function canViewPost(post, user) {
  if (isScopeTeam(user)) return true;
  const targetInstitution = post.targetInstitution?.toString?.() || null;
  if (!targetInstitution) return true;
  return targetInstitution === user.institution?.toString?.();
}

function serializePost(post, meId) {
  const liked = post.likes.some((id) => id.toString() === meId);
  const celebrated = post.celebrates.some((id) => id.toString() === meId);
  const targetInstitutionId = post.targetInstitution?.toString?.() || null;
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
    media: post.media || [],
    targetInstitutionId,
    visibility: targetInstitutionId ? "institution" : "global",
  };
}

feedRouter.get("/", asyncHandler(async (req, res) => {
  const filter = buildFeedVisibilityFilter(req.user, req.query.scope);
  const posts = await FeedPost.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit || 100), 200));
  sendSuccess(res, { items: posts.map((post) => serializePost(post, req.user.id)), next_cursor: null, has_more: false });
}));

feedRouter.post("/", validate(createSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const profile = await Profile.findOne({ user: req.user._id }).populate("institution");
  
  let targetInstitution = null;
  let campusName = "";

  if (isScopeTeam(user)) {
    targetInstitution = req.body.target_institution_id || null;
    if (targetInstitution) {
      const inst = await Institution.findById(targetInstitution);
      if (!inst) throw notFound("Target institution not found");
      campusName = inst ? inst.name : "Target Campus";
    } else {
      campusName = "Global Update";
    }
  } else {
    targetInstitution = req.user.institution;
    campusName = profile?.institution?.name || (req.user.institution ? (await Institution.findById(req.user.institution))?.name : "") || "";
  }

  const post = await FeedPost.create({
    user: req.user._id,
    targetInstitution,
    authorName: user?.name || req.user.email || "Scope User",
    campus: campusName,
    type: req.body.type || "Update",
    content: req.body.content,
    likes: [],
    celebrates: [],
    comments: [],
    media: req.body.media || [],
  });
  sendSuccess(res, { post: serializePost(post, req.user.id) }, "Post created", 201);
}));

feedRouter.post("/:id/react", validate(reactionSchema), asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id);
  if (!post) throw notFound("Post not found");
  if (!canViewPost(post, req.user)) throw forbidden("You cannot react to this post");
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
  if (!canViewPost(post, req.user)) throw forbidden("You cannot comment on this post");
  const user = await User.findById(req.user._id);
  post.comments.push({ user: req.user._id, authorName: user?.name || req.user.email || "Scope User", text: req.body.text });
  await post.save();
  sendSuccess(res, { post: serializePost(post, req.user.id) }, "Comment added", 201);
}));
