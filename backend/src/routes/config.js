import express from "express";
import { z } from "zod";
import { getConfig, updateConfig } from "../controllers/config.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

export const configRouter = express.Router();

const configSchema = z.object({
  brand: z.record(z.unknown()).optional(),
  contact: z.record(z.unknown()).optional(),
  features: z.record(z.unknown()).optional(),
  campuses: z.array(z.unknown()).optional(),
});

configRouter.get("/", asyncHandler(getConfig));
configRouter.patch("/", authMiddleware, requirePermission("manage_features"), validate(configSchema), asyncHandler(updateConfig));
