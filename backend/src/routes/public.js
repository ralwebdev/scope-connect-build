import express from "express";
import { z } from "zod";
import { PublicSubmission } from "../models/index.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";

export const publicRouter = express.Router();

const email = z.string().email().max(255);
const optionalTrimmed = (max) => z.string().trim().max(max).optional().transform((value) => value || undefined);

const feedbackSchema = z.object({
  source: z.enum(["feedback_page", "feedback_widget"]),
  rating: z.number().int().min(1).max(5).optional(),
  score: z.number().int().min(0).max(10).optional(),
  type: optionalTrimmed(80),
  message: z.string().trim().min(10).max(1000),
});

const waitlistSchema = z.object({
  source: z.literal("waitlist_page"),
  name: z.string().trim().min(1).max(100),
  email,
  campus: z.string().trim().min(1).max(120),
  interests: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

const contactSchema = z.object({
  source: z.enum(["contact_page", "footer", "support_page"]),
  name: optionalTrimmed(100),
  email,
  reason: optionalTrimmed(80),
  message: z.string().trim().min(10).max(1500),
});

const supportIssueSchema = z.object({
  source: z.literal("support_page"),
  message: z.string().trim().min(5).max(1500),
});

const ambassadorSchema = z.object({
  source: z.literal("ambassador_page"),
  name: z.string().trim().min(1).max(100),
  email,
  campus: z.string().trim().min(1).max(120),
  why: z.string().trim().min(30).max(1000),
});

publicRouter.post("/feedback", validate(feedbackSchema), asyncHandler(async (req, res) => {
  const payload = req.body;
  const submission = await PublicSubmission.create({
    kind: "feedback",
    source: payload.source,
    rating: payload.rating ?? (payload.score != null ? Math.max(1, Math.round(payload.score / 2)) : null),
    score: payload.score ?? null,
    type: payload.type,
    message: payload.message,
  });

  sendSuccess(res, { submission_id: submission.id }, "Feedback received", 201);
}));

publicRouter.post("/waitlist", validate(waitlistSchema), asyncHandler(async (req, res) => {
  return res.status(403).json({ success: false, error: "Waitlist registration is currently closed." });
}));

publicRouter.post("/contact", validate(contactSchema), asyncHandler(async (req, res) => {
  const payload = req.body;
  const submission = await PublicSubmission.create({
    kind: "contact",
    source: payload.source,
    name: payload.name,
    email: payload.email,
    reason: payload.reason,
    message: payload.message,
  });

  sendSuccess(res, { submission_id: submission.id }, "Message received", 201);
}));

publicRouter.post("/support-issue", validate(supportIssueSchema), asyncHandler(async (req, res) => {
  const payload = req.body;
  const submission = await PublicSubmission.create({
    kind: "support_issue",
    source: payload.source,
    message: payload.message,
  });

  sendSuccess(res, { submission_id: submission.id }, "Issue logged", 201);
}));

publicRouter.post("/ambassador", validate(ambassadorSchema), asyncHandler(async (req, res) => {
  return res.status(403).json({ success: false, error: "Ambassador registration is currently closed." });
}));

publicRouter.get("/check-link", asyncHandler(async (req, res) => {
  const urlString = req.query.url;
  if (!urlString) {
    return res.status(400).json({ error: "URL parameter required" });
  }

  // 1. Syntactic validation
  try {
    new URL(urlString);
  } catch (err) {
    return sendSuccess(res, { valid: false, reason: "malformed" });
  }

  // 2. Reachability validation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(urlString, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // If it's a standard error state, mark as broken
    if (response.status >= 400) {
      return sendSuccess(res, { valid: false, reason: `status_${response.status}` });
    }

    return sendSuccess(res, { valid: true });
  } catch (err) {
    clearTimeout(timeoutId);
    return sendSuccess(res, { valid: false, reason: "unreachable" });
  }
}));
