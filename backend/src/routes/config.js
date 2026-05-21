import express from "express";
import { z } from "zod";
import { getConfig, updateConfig } from "../controllers/config.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

export const configRouter = express.Router();

const configSchema = z.object({
  brand: z.object({
    name: z.string().max(100).optional(),
    primaryColor: z.string().max(50).optional(),
    logoUrl: z.string().max(500).optional(),
  }).optional(),
  contact: z.object({
    email: z.string().email().max(255).optional(),
    supportUrl: z.string().max(500).optional(),
  }).optional(),
  features: z.object({
    enableXP: z.boolean().optional(),
    enableMarketplace: z.boolean().optional(),
    enableChallenges: z.boolean().optional(),
  }).optional(),
  campuses: z.array(z.string()).optional(),
});

configRouter.get("/", asyncHandler(getConfig));
configRouter.patch("/", authMiddleware, requirePermission("manage_features"), validate(configSchema), asyncHandler(updateConfig));
