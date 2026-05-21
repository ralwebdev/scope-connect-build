import express from "express";
import { z } from "zod";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";
import { authMiddleware } from "../middleware/auth.js";

export const feedbackRouter = express.Router();

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  type: z.string().min(1).max(100),
  text: z.string().min(1).max(5000),
});

feedbackRouter.post("/", authMiddleware, validate(feedbackSchema), asyncHandler(submitFeedback));
