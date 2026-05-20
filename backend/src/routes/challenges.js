import express from "express";
import { z } from "zod";
import { listChallenges, createChallenge } from "../controllers/challenges.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

export const challengesRouter = express.Router();

const challengeSchema = z.object({
  scope: z.enum(["campus", "global"]),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  seatsTotal: z.number().int().min(1).max(100000),
  reward: z.string().min(1).max(100),
});

challengesRouter.get("/", authMiddleware, asyncHandler(listChallenges));
challengesRouter.post("/", authMiddleware, requirePermission("manage_projects"), validate(challengeSchema), asyncHandler(createChallenge));
